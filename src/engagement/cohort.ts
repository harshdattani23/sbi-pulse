import type { PersonaSpec } from "../data/personas.ts";
import type { LifeEventType } from "../domain.ts";
import { generateCustomer } from "../data/generator.ts";
import { selectJourney, JOURNEYS } from "../journeys/orchestrator.ts";
import { checkContactPolicy, type GateContext } from "../governance/consentGate.ts";

// ---------------------------------------------------------------------------
// Cohort simulation + uplift engine.
// The 8 hero personas prove the *mechanics*; this proves the *impact*. We
// generate a synthetic population, split it into treatment (gets Pulse) vs a
// holdout (business-as-usual), simulate outcomes, and measure the LIFT —
// because engagement must be judged on incremental behaviour change, not clicks.
// Fully deterministic (seeded) so the numbers are stable on stage.
// ---------------------------------------------------------------------------

function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITIES = ["Bhubaneswar", "Kanpur", "Kochi", "Chennai", "Hyderabad", "Pune", "Mumbai", "Patna", "Lucknow", "Indore"];
const LANGS = ["en", "hi", "or"] as const;

// scenario → weight in the population
const SCENARIO_MIX: Array<[PersonaSpec["scenario"], number]> = [
  ["dormant", 0.24],
  ["salary_hike", 0.16],
  ["overspend", 0.15],
  ["financial_stress", 0.12],
  ["new_baby", 0.08],
  ["relocation", 0.07],
  ["none", 0.18],
];

function pickScenario(r: number): PersonaSpec["scenario"] {
  let acc = 0;
  for (const [s, w] of SCENARIO_MIX) { acc += w; if (r <= acc) return s; }
  return "none";
}

function makeSpec(i: number): PersonaSpec {
  const rand = rng(1000 + i * 2654435761);
  const scenario = pickScenario(rand());
  const income = scenario === "dormant" ? 18000 + Math.floor(rand() * 20000) : 35000 + Math.floor(rand() * 90000);
  const age = 24 + Math.floor(rand() * 38);
  const marketingConsent = rand() > 0.12; // ~12% withhold marketing consent
  const params: Record<string, number | string> = {};
  if (scenario === "salary_hike") { params.hikeMonthIndex = 3; params.hikePct = 30 + Math.floor(rand() * 25); }
  if (scenario === "financial_stress") params.stressStartMonthIndex = 2;
  if (scenario === "new_baby") params.babyMonthIndex = 3;
  if (scenario === "relocation") { params.newCity = CITIES[Math.floor(rand() * CITIES.length)]; params.moveMonthIndex = 3; params.hikePct = 25; }

  return {
    id: `c${i}`,
    name: `Customer ${i}`,
    age,
    homeCity: CITIES[Math.floor(rand() * CITIES.length)],
    language: LANGS[Math.floor(rand() * LANGS.length)],
    segment: income > 90000 ? "affluent" : income > 55000 ? "mass_affluent" : "mass",
    baselineIncome: scenario === "none" ? income : income,
    baselineRent: rand() > 0.4 ? 8000 + Math.floor(rand() * 20000) : 0,
    openingBalance: 10000 + Math.floor(rand() * 120000),
    scenario,
    scenarioParams: params,
    consents: [
      { purpose: "behavioural_analysis", granted: true, grantedAt: "2026-01-01" },
      { purpose: "proactive_marketing", granted: marketingConsent, grantedAt: "2026-01-01" },
      { purpose: "account_aggregator", granted: true, grantedAt: "2026-01-01" },
    ],
  };
}

// per-journey behavioural response model (treatment vs holdout baseline)
const MODEL: Record<string, { pEngage: number; pPositiveGivenEngage: number; baseline: number }> = {
  first_sip:        { pEngage: 0.55, pPositiveGivenEngage: 0.52, baseline: 0.10 },
  overspend_rescue: { pEngage: 0.50, pPositiveGivenEngage: 0.50, baseline: 0.12 },
  dormant_revival:  { pEngage: 0.42, pPositiveGivenEngage: 0.46, baseline: 0.07 },
  stress_shield:    { pEngage: 0.62, pPositiveGivenEngage: 0.56, baseline: 0.15 },
  new_baby_nest:    { pEngage: 0.60, pPositiveGivenEngage: 0.50, baseline: 0.12 },
  debt_free:        { pEngage: 0.55, pPositiveGivenEngage: 0.50, baseline: 0.12 },
};

interface JourneyAgg {
  id: string; name: string; emoji: string;
  eligible: number; delivered: number; engaged: number; completed: number;
  holdoutN: number; holdoutPositive: number;
}

export function runImpact(size = 1500, ctx?: GateContext) {
  const gate: GateContext = ctx ?? { nowHour: 11, recentContacts: 0, frequencyCap: 2 };
  const agg = new Map<string, JourneyAgg>();
  const ensure = (id: string) => {
    let a = agg.get(id);
    if (!a) { const d = JOURNEYS[id]; a = { id, name: d.name, emoji: d.emoji, eligible: 0, delivered: 0, engaged: 0, completed: 0, holdoutN: 0, holdoutPositive: 0 }; agg.set(id, a); }
    return a;
  };

  let suppressed = 0, treatmentN = 0, holdoutTotal = 0;
  let treatBumpSum = 0, treatDeliveredN = 0, holdBumpSum = 0;

  for (let i = 0; i < size; i++) {
    const customer = generateCustomer(makeSpec(i));
    const { selection } = selectJourney(customer);
    if (!selection) continue;
    const a = ensure(selection.journeyId);
    a.eligible += 1;
    const m = MODEL[selection.journeyId];
    const r = rng(7000 + i * 40503);

    // 20% holdout (business-as-usual, no proactive engagement)
    const isHoldout = r() < 0.2;
    if (isHoldout) {
      holdoutTotal += 1; a.holdoutN += 1;
      const positive = r() < m.baseline;
      if (positive) a.holdoutPositive += 1;
      holdBumpSum += positive ? 10 : 0; // engagement-score points from a self-driven action
      continue;
    }

    // treatment: gate → deliver → engage → positive outcome
    treatmentN += 1;
    const def = JOURNEYS[selection.journeyId];
    const gov = checkContactPolicy(customer, { isCare: !!def.isCare, ctx: gate });
    if (gov.verdict !== "approved") { suppressed += 1; continue; }
    a.delivered += 1; treatDeliveredN += 1;

    let bump = 0;
    if (r() < m.pEngage) {
      a.engaged += 1;
      if (r() < m.pPositiveGivenEngage) { a.completed += 1; bump = 16; } else { bump = 5; }
    }
    treatBumpSum += bump;
  }

  const journeys = [...agg.values()].map((a) => {
    const treatRate = a.delivered ? a.completed / a.delivered : 0;
    const holdRate = a.holdoutN ? a.holdoutPositive / a.holdoutN : 0;
    return {
      id: a.id, name: a.name, emoji: a.emoji,
      eligible: a.eligible, delivered: a.delivered, engaged: a.engaged, completed: a.completed,
      treatRatePct: Math.round(treatRate * 100),
      holdRatePct: Math.round(holdRate * 100),
      upliftPp: Math.round((treatRate - holdRate) * 100),
    };
  }).sort((x, y) => y.eligible - x.eligible);

  const totalDelivered = journeys.reduce((s, j) => s + j.delivered, 0);
  const totalCompleted = journeys.reduce((s, j) => s + j.completed, 0);
  const totalHoldN = [...agg.values()].reduce((s, a) => s + a.holdoutN, 0);
  const totalHoldPos = [...agg.values()].reduce((s, a) => s + a.holdoutPositive, 0);
  const treatRate = totalDelivered ? totalCompleted / totalDelivered : 0;
  const holdRate = totalHoldN ? totalHoldPos / totalHoldN : 0;

  const treatEngAvg = treatDeliveredN ? treatBumpSum / treatDeliveredN : 0;
  const holdEngAvg = holdoutTotal ? holdBumpSum / holdoutTotal : 0;

  return {
    cohort: { size, treatment: treatmentN, holdout: holdoutTotal, eligible: journeys.reduce((s, j) => s + j.eligible, 0), suppressed },
    overall: {
      treatRatePct: Math.round(treatRate * 100),
      holdRatePct: Math.round(holdRate * 100),
      upliftPp: Math.round((treatRate - holdRate) * 100),
      upliftRelPct: holdRate > 0 ? Math.round(((treatRate - holdRate) / holdRate) * 100) : 0,
      engagementLift: Math.round(treatEngAvg - holdEngAvg),
    },
    journeys,
  };
}
