import { PERSONAS, getPersona } from "../data/personas.ts";
import { generateCustomer } from "../data/generator.ts";
import { startJourney, advance, renderStep, selectJourney, JOURNEYS } from "../journeys/orchestrator.ts";
import { runImpact } from "../engagement/cohort.ts";
import { computeScores } from "../engagement/scores.ts";
import { hasGemini } from "../ai/gemini.ts";
import { reasonEngagement, continueConversation } from "../ai/reasoner.ts";
import { bestToneForSegment, recordOutcome, flywheelState, train } from "../learn/flywheel.ts";
import type { JourneySession } from "../journeys/types.ts";
import { checkContactPolicy, type GateContext } from "../governance/consentGate.ts";

// ---------------------------------------------------------------------------
// Pulse API — serializable engagement endpoints + in-memory journey sessions.
// ---------------------------------------------------------------------------

const sessions = new Map<string, JourneySession>();

// AI conversational sessions (Gemini-driven journeys)
interface AiSession {
  customerId: string; journeyId: string; goal: string; isCare: boolean; language: string;
  segment: string; toneId: string; toneLabel: string;
  history: Array<{ role: "assistant" | "user"; text: string }>;
  status: "active" | "completed"; outcome?: string;
}
const aiSessions = new Map<string, AiSession>();

// ---- Explainability / audit trail -----------------------------------------
interface AuditEntry { stage: string; summary: string; detail?: string; seq: number }
const audits = new Map<string, AuditEntry[]>();
function resetAudit(id: string) { audits.set(id, []); }
function pushAudit(id: string, stage: string, summary: string, detail?: string) {
  const log = audits.get(id) ?? [];
  log.push({ stage, summary, detail, seq: log.length + 1 });
  audits.set(id, log);
}
const getAudit = (id: string) => audits.get(id) ?? [];

export interface PulseOpts {
  hour?: number;
  recentContacts?: number;
  frequencyCap?: number;
}
function toCtx(o: PulseOpts): GateContext {
  return { nowHour: o.hour ?? 11, recentContacts: o.recentContacts ?? 0, frequencyCap: o.frequencyCap ?? 2 };
}

const POSITIVE = new Set(["sip_500", "sip_100", "cap_set", "reactivated", "goal_started", "coach_on"]);

function journeyMeta(id: string) {
  const d = JOURNEYS[id];
  return d ? { id: d.id, name: d.name, emoji: d.emoji, goal: d.goal, isCare: !!d.isCare } : null;
}

function customerSummary(id: string) {
  const spec = getPersona(id)!;
  const customer = generateCustomer(spec);
  const { selection, scores } = selectJourney(customer);
  const preview = selection ? journeyMeta(selection.journeyId) : null;
  return {
    id: customer.id,
    name: customer.name,
    age: customer.age,
    city: customer.homeCity,
    language: customer.preferredLanguage,
    segment: customer.segment,
    scenario: spec.scenario,
    scores,
    journey: preview,
    reason: selection?.reason ?? "No confident engagement trigger — staying silent.",
    consents: customer.consents.map((c) => ({ purpose: c.purpose, granted: c.granted })),
    recentTxns: customer.transactions.slice(-8).reverse(),
  };
}

export function listCustomers() {
  return PERSONAS.map((p) => customerSummary(p.id));
}

/** AI-first entry point: Gemini reasons + drives; deterministic engine is the fallback. */
export async function startForCustomer(id: string, opts: PulseOpts = {}) {
  const spec = getPersona(id);
  if (!spec) return null;
  aiSessions.delete(id);
  if (hasGemini()) {
    try {
      return await startWithAI(id, spec, opts);
    } catch (e) {
      // fall through to the deterministic engine — the demo never breaks
      pushAudit(id, "warn", `AI reasoning unavailable (${String(e).slice(0, 60)}) — using rule engine.`);
    }
  }
  return startDeterministic(id, opts);
}

async function startWithAI(id: string, spec: ReturnType<typeof getPersona> & {}, opts: PulseOpts) {
  const customer = generateCustomer(spec);
  resetAudit(id);
  const scores = computeScores(customer);
  const consentLine = customer.consents.map((c) => `${c.purpose.split("_")[0]} ${c.granted ? "✓" : "✗"}`).join(" · ");
  pushAudit(id, "observe", `Observed ${customer.transactions.length} transactions; consent: ${consentLine}.`);

  const tone = bestToneForSegment(customer.segment);
  const dec = await reasonEngagement(customer, tone);
  pushAudit(id, "infer", `AI read the data: ${dec.situation}`, `Scores — engagement ${scores.engagement}, health ${scores.financialHealth}, churn ${scores.churnRisk}.`);

  const def = JOURNEYS[dec.journeyId];
  if (dec.journeyId === "none" || !def) {
    pushAudit(id, "decide", "Agent chose to stay silent — no confident, helpful reason to engage.", dec.reasoning);
    return {
      ...customerSummaryLite(customer), ai: true, journey: null, situation: dec.situation,
      reason: dec.reasoning, scores, delivered: false,
      governance: { verdict: "suppressed", reasons: ["Agent judged there was no helpful reason to reach out."] },
      audit: getAudit(id),
    };
  }

  pushAudit(id, "decide", `AI chose “${def.name}” (confidence ${Math.round(dec.confidence * 100)}%).`, dec.reasoning);
  pushAudit(id, "learn", `Applied learned tone “${tone.label}” — the policy's current best for the ${customer.segment} segment.`);
  const governance = checkContactPolicy(customer, { isCare: !!def.isCare, ctx: toCtx(opts) });
  const delivered = governance.verdict === "approved";
  pushAudit(id, "gate", `Governance: ${governance.verdict}.`, governance.reasons.join(" · "));
  pushAudit(id, "deliver", delivered ? `Delivered AI-written message in ${customer.preferredLanguage}.` : "No outbound — insight retained in-app only.");

  aiSessions.set(id, {
    customerId: id, journeyId: def.id, goal: def.goal, isCare: !!def.isCare, language: customer.preferredLanguage,
    segment: customer.segment, toneId: tone.id, toneLabel: tone.label,
    history: delivered ? [{ role: "assistant", text: dec.message }] : [], status: "active",
  });

  return {
    ...customerSummaryLite(customer), ai: true, journey: journeyMeta(def.id), situation: dec.situation,
    reason: dec.reasoning, scores, governance, delivered,
    step: {
      id: "ai", kind: def.isCare ? "care" : "insight", channel: def.isCare ? "yono_card" : "whatsapp",
      language: customer.preferredLanguage, title: dec.title, body: dec.message,
      options: dec.quickReplies.map((q) => ({ label: q, choice: q })), terminal: false,
    },
    status: "active", audit: getAudit(id),
  };
}

function startDeterministic(id: string, opts: PulseOpts = {}) {
  const spec = getPersona(id);
  if (!spec) return null;
  const customer = generateCustomer(spec);
  const res = startJourney(customer, toCtx(opts));
  resetAudit(id);

  const consentLine = customer.consents.map((c) => `${c.purpose.split("_")[0]} ${c.granted ? "✓" : "✗"}`).join(" · ");
  pushAudit(id, "observe", `Observed ${customer.transactions.length} transactions; consent: ${consentLine}.`);
  pushAudit(id, "infer", `Scores — engagement ${res.scores.engagement}, health ${res.scores.financialHealth}, churn ${res.scores.churnRisk}.`,
    (res.scores.drivers || []).join(" · "));

  if (!res.selection || !res.session || !res.def) {
    pushAudit(id, "decide", "No confident engagement trigger — staying silent.");
    return { ...customerSummaryLite(customer), ai: false, selection: null, delivered: false, governance: res.governance ?? null, audit: getAudit(id) };
  }

  pushAudit(id, "decide", `Selected journey “${res.def.name}”.`, res.selection.reason);
  pushAudit(id, "gate", `Governance: ${res.governance!.verdict}.`, res.governance!.reasons.join(" · "));
  if (res.delivered) pushAudit(id, "deliver", `Delivered step “${res.def.steps[res.session.currentStep].id}” via ${res.def.steps[res.session.currentStep].channel} in ${customer.preferredLanguage}.`);
  else pushAudit(id, "deliver", "No outbound message — insight retained in-app only.");

  sessions.set(id, res.session);
  const stepDef = res.def.steps[res.session.currentStep];
  return {
    ...customerSummaryLite(customer),
    journey: journeyMeta(res.def.id),
    reason: res.selection.reason,
    facts: res.selection.facts,
    scores: res.scores,
    governance: res.governance,
    delivered: res.delivered,
    step: renderStep(stepDef, customer, res.session.facts, res.def.id),
    status: res.session.status,
    ai: false,
    audit: getAudit(id),
  };
}

function customerSummaryLite(customer: ReturnType<typeof generateCustomer>) {
  return {
    id: customer.id,
    name: customer.name,
    city: customer.homeCity,
    language: customer.preferredLanguage,
    consents: customer.consents.map((c) => ({ purpose: c.purpose, granted: c.granted })),
  };
}

export async function replyForCustomer(id: string, input: string) {
  // AI conversational session takes precedence
  const ai = aiSessions.get(id);
  if (ai) return replyWithAI(id, ai, input);
  return replyDeterministic(id, input);
}

async function replyWithAI(id: string, session: AiSession, userText: string) {
  const customer = generateCustomer(getPersona(id)!);
  pushAudit(id, "reply", `Customer: “${userText}”.`);
  try {
    const turn = await continueConversation(customer, session.goal, session.isCare, session.history, userText);
    session.history.push({ role: "user", text: userText });
    session.history.push({ role: "assistant", text: turn.message });

    let reward: null | { kind: "positive" | "rm" | "soft"; outcome?: string } = null;
    if (turn.complete && turn.outcome !== "ongoing") {
      session.status = "completed"; session.outcome = turn.outcome;
      reward = turn.outcome === "positive" ? { kind: "positive", outcome: turn.outcome }
        : turn.outcome === "rm_handoff" ? { kind: "rm", outcome: turn.outcome }
        : { kind: "soft", outcome: turn.outcome };
      pushAudit(id, "complete", `Journey completed — outcome: ${turn.outcome}.`);
      // FLYWHEEL: fold this real outcome back into the learning policy
      const rewardBit: 0 | 1 = turn.outcome === "positive" ? 1 : 0;
      recordOutcome(session.journeyId, session.segment, session.toneId, rewardBit);
      pushAudit(id, "learn", `Outcome fed back to policy — “${session.toneLabel}” tone, reward ${rewardBit}. The bandit posterior updated; this makes the next decision smarter.`);
    }

    return {
      ai: true,
      step: {
        id: "ai", kind: session.isCare ? "care" : (turn.complete ? "celebrate" : "insight"),
        channel: session.isCare ? "yono_card" : "whatsapp", language: session.language,
        title: turn.title ?? "", body: turn.message,
        options: turn.complete ? [] : turn.quickReplies.map((q) => ({ label: q, choice: q })),
        terminal: turn.complete,
      },
      status: session.status, outcome: session.outcome ?? null, reward, audit: getAudit(id),
    };
  } catch (e) {
    pushAudit(id, "warn", `AI turn failed (${String(e).slice(0, 50)}).`);
    return { ai: true, step: { id: "ai", kind: "close", channel: "whatsapp", language: session.language, title: "", body: "Thanks — I'll follow up shortly.", options: [], terminal: true }, status: "completed", reward: { kind: "soft" }, audit: getAudit(id) };
  }
}

function replyDeterministic(id: string, choice: string) {
  const session = sessions.get(id);
  if (!session) return { error: "no active journey" };
  const spec = getPersona(id)!;
  const customer = generateCustomer(spec);

  const prevLabel = session.history.length ? session.history[session.history.length - 1].label : choice;
  const { step } = advance(session, choice);
  const rendered = step ? renderStep(step, customer, session.facts, session.journeyId) : null;
  const chosen = session.history[session.history.length - 1]?.label ?? choice;
  pushAudit(id, "reply", `Customer chose “${chosen}”.`, rendered ? `Branched to “${rendered.title}”.` : undefined);

  let reward: null | { kind: "positive" | "rm" | "soft"; outcome?: string } = null;
  if (session.status === "completed") {
    if (session.outcome && POSITIVE.has(session.outcome)) reward = { kind: "positive", outcome: session.outcome };
    else if (session.outcome === "rm_handoff") reward = { kind: "rm", outcome: session.outcome };
    else reward = { kind: "soft", outcome: session.outcome };
    pushAudit(id, "complete", `Journey completed — outcome: ${session.outcome ?? "closed"}.`);
  }

  return {
    step: rendered,
    status: session.status,
    outcome: session.outcome ?? null,
    reward,
    history: session.history,
    ai: false,
    audit: getAudit(id),
  };
}

export function cockpit(opts: PulseOpts = {}) {
  const ctx = toCtx(opts);
  const rows = PERSONAS.map((p) => {
    const customer = generateCustomer(getPersona(p.id)!);
    const res = startJourney(customer, ctx);
    return {
      id: customer.id,
      name: customer.name,
      segment: customer.segment,
      scores: res.scores,
      journey: res.def ? journeyMeta(res.def.id) : null,
      delivered: res.delivered,
      verdict: res.governance?.verdict ?? "none",
      isCare: !!res.def?.isCare,
    };
  });

  const avg = (f: (r: (typeof rows)[number]) => number) => Math.round(rows.reduce((s, r) => s + f(r), 0) / rows.length);

  // journey mix
  const mix = new Map<string, { name: string; emoji: string; count: number }>();
  for (const r of rows) {
    if (!r.journey) continue;
    const m = mix.get(r.journey.id) ?? { name: r.journey.name, emoji: r.journey.emoji, count: 0 };
    m.count += 1;
    mix.set(r.journey.id, m);
  }

  const band = (v: number) => (v >= 66 ? "high" : v >= 33 ? "mid" : "low");
  const engagementBands = { low: 0, mid: 0, high: 0 };
  for (const r of rows) engagementBands[band(r.scores.engagement) as keyof typeof engagementBands] += 1;

  return {
    metrics: {
      customers: rows.length,
      avgEngagement: avg((r) => r.scores.engagement),
      avgChurnRisk: avg((r) => r.scores.churnRisk),
      dormantAtRisk: rows.filter((r) => r.scores.dormancyRisk >= 70).length,
      careInterventions: rows.filter((r) => r.isCare).length,
      delivered: rows.filter((r) => r.delivered).length,
      suppressed: rows.filter((r) => r.verdict === "suppressed").length,
    },
    journeyMix: [...mix.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count),
    engagementBands,
    churnBoard: rows
      .filter((r) => r.journey)
      .map((r) => ({ id: r.id, name: r.name, churnRisk: r.scores.churnRisk, dormancyRisk: r.scores.dormancyRisk, engagement: r.scores.engagement, journey: r.journey }))
      .sort((a, b) => b.churnRisk - a.churnRisk),
    projected: { churnReductionPct: "15–25%", note: "Illustrative: proactive engagement cuts churn 15–25% (industry); retention is 5–7× cheaper than acquisition." },
  };
}

export function impact(opts: PulseOpts = {}) {
  return runImpact(1500, toCtx(opts));
}

const TRIGGERS: Record<string, string> = {
  first_sip: "Income rose (salary hike) or a healthy, stable surplus",
  overspend_rescue: "Discretionary spend rising >80% with income intact",
  dormant_revival: "No activity for 60+ days (dormancy risk ≥ 70)",
  stress_shield: "Financial-stress signals — care-first, cross-sell suppressed",
  new_baby_nest: "Maternity spend followed by baby-care pattern",
};

/** Flywheel — the learning policy's current state, optionally after `rounds` more. */
export function flywheel(rounds = 0) {
  if (rounds > 0) train(Math.min(rounds, 20000));
  return flywheelState();
}

/** Journey Studio — the no-code platform view: every journey's state machine. */
export function studio() {
  return Object.values(JOURNEYS).map((d) => ({
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    goal: d.goal,
    isCare: !!d.isCare,
    trigger: TRIGGERS[d.id] ?? "—",
    startStep: d.startStep,
    steps: Object.values(d.steps).map((s) => ({
      id: s.id,
      kind: s.kind,
      channel: s.channel,
      title: s.title,
      terminal: s.options.length === 0,
      effect: s.effect,
      options: s.options.map((o) => ({ label: o.label, choice: o.choice, next: o.next, nextTitle: o.next ? d.steps[o.next]?.title : null })),
    })),
  }));
}
