import type { Customer, GovernanceResult } from "../domain.ts";
import type { JourneyDef, JourneySession, JourneyStep } from "./types.ts";
import { JOURNEYS } from "./definitions.ts";
import { inferLifeEvents, primaryEvent } from "../agents/signalAgent.ts";
import { computeScores, detectOverspend, type Scores } from "../engagement/scores.ts";
import { checkContactPolicy, type GateContext } from "../governance/consentGate.ts";
import { DEMO_NOW } from "../data/generator.ts";
import { translate } from "./i18n.ts";

// ---------------------------------------------------------------------------
// Journey Orchestrator — the agentic core of Pulse.
//   selectJourney : signals + scores  → which journey (or silence)
//   startJourney  : instantiate + gate through the compliance spine
//   advance       : branch on the customer's reply
// ---------------------------------------------------------------------------

const firstName = (name: string) => name.split(/[ &]/)[0];

export interface Selection {
  journeyId: string;
  reason: string;
  facts: Record<string, string | number>;
}

/** Anticipatory + wellness reasoning → the single next-best engagement. */
export function selectJourney(customer: Customer): { selection: Selection | null; scores: Scores } {
  const scores = computeScores(customer);
  const hyps = inferLifeEvents(customer);
  const primary = primaryEvent(hyps);
  const over = detectOverspend(customer);

  // Priority: care first, then re-engagement, then life-events, then habits.
  let selection: Selection | null = null;

  if (primary?.type === "financial_stress") {
    selection = { journeyId: "stress_shield", reason: "Financial-stress signals detected — leading with care, not a sale.", facts: {} };
  } else if (scores.dormancyRisk >= 70 || scores.daysSinceLastTxn > 60) {
    selection = { journeyId: "dormant_revival", reason: `Silent for ${scores.daysSinceLastTxn} days (dormancy risk ${scores.dormancyRisk}).`, facts: {} };
  } else if (primary?.type === "new_baby") {
    selection = { journeyId: "new_baby_nest", reason: "A new child in the family — plan-early journey.", facts: {} };
  } else if (over.detected) {
    selection = { journeyId: "overspend_rescue", reason: `Lifestyle spend up ${over.growthPct}% (${over.sharePct}% of outflow).`, facts: { growth: over.growthPct } };
  } else if (primary?.type === "salary_hike") {
    selection = { journeyId: "first_sip", reason: "Income rose — good moment to start investing.", facts: {} };
  } else if (scores.financialHealth >= 60 && scores.savingsRatePct >= 10) {
    selection = { journeyId: "first_sip", reason: "Healthy surplus — habit-building opportunity.", facts: {} };
  }

  return { selection, scores };
}

export function renderStep(
  step: JourneyStep,
  customer: Customer,
  facts: Record<string, string | number>,
  journeyId?: string,
) {
  const fill = (s: string) =>
    s.replace(/\{name\}/g, firstName(customer.name)).replace(/\{(\w+)\}/g, (_, k) => String(facts[k] ?? ""));

  const lang = customer.preferredLanguage;
  const tr = journeyId ? translate(lang, journeyId, step.id) : null;
  const title = fill(tr?.title ?? step.title);
  const body = fill(tr?.body ?? step.body);
  const options = step.options.map((o) => ({ ...o, label: tr?.opts?.[o.choice] ?? o.label }));

  return {
    id: step.id,
    kind: step.kind,
    channel: step.channel,
    language: lang,
    title,
    body,
    options,
    effect: step.effect,
    terminal: step.options.length === 0,
  };
}

export interface StartResult {
  selection: Selection | null;
  scores: Scores;
  def?: JourneyDef;
  session?: JourneySession;
  governance?: GovernanceResult;
  delivered: boolean;
}

export function startJourney(customer: Customer, ctx?: GateContext): StartResult {
  const { selection, scores } = selectJourney(customer);
  if (!selection) return { selection: null, scores, delivered: false };

  const def = JOURNEYS[selection.journeyId];
  const governance = checkContactPolicy(customer, { isCare: !!def.isCare, ctx });
  const delivered = governance.verdict === "approved";

  const session: JourneySession = {
    customerId: customer.id,
    journeyId: def.id,
    currentStep: def.startStep,
    status: "active",
    facts: selection.facts,
    history: [{ step: def.startStep, at: DEMO_NOW }],
    startedAt: DEMO_NOW,
  };

  return { selection, scores, def, session, governance, delivered };
}

/** Advance the journey by the customer's chosen option — this is the branch. */
export function advance(session: JourneySession, choice: string): { step: JourneyStep | null } {
  const def = JOURNEYS[session.journeyId];
  const current = def.steps[session.currentStep];
  const opt = current.options.find((o) => o.choice === choice);
  if (!opt) return { step: null };

  session.history.push({ step: session.currentStep, choice, label: opt.label, at: DEMO_NOW });

  if (opt.next === null) {
    session.status = "completed";
    return { step: null };
  }
  session.currentStep = opt.next;
  const next = def.steps[opt.next];
  if (next.options.length === 0) {
    session.status = "completed";
    session.outcome = next.effect;
  }
  return { step: next };
}

export { JOURNEYS };
