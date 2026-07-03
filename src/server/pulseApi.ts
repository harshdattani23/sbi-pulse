import { PERSONAS, getPersona } from "../data/personas.ts";
import { generateCustomer } from "../data/generator.ts";
import { startJourney, advance, renderStep, selectJourney, JOURNEYS } from "../journeys/orchestrator.ts";
import { runImpact } from "../engagement/cohort.ts";
import { computeScores } from "../engagement/scores.ts";
import { hasGemini, type Content } from "../ai/gemini.ts";
import { newSession, runAgentTurn, describeAction } from "../ai/agent.ts";
import type { AgentSession } from "../ai/tools.ts";
import { forecast } from "../ml/forecaster.ts";
import { bestToneForSegment, recordOutcome, flywheelState, train } from "../learn/flywheel.ts";
import type { JourneySession } from "../journeys/types.ts";
import { checkContactPolicy, type GateContext } from "../governance/consentGate.ts";

// ---------------------------------------------------------------------------
// Pulse API — serializable engagement endpoints + in-memory journey sessions.
// ---------------------------------------------------------------------------

const sessions = new Map<string, JourneySession>();

// ReAct agent sessions — the model drives; we hold state + transcript.
interface AiSession {
  agent: AgentSession;
  history: Content[];
  language: string; segment: string; toneId: string; toneLabel: string;
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

/** Map the agent's tool actions into the audit trail. */
function auditAgentActions(id: string, session: AgentSession, fromSeq: number) {
  const stageFor = (tool: string) =>
    tool.startsWith("get_") ? "observe"
    : tool === "respond_to_customer" ? "gate"
    : "act";
  for (const a of session.actions.filter((x) => x.at > fromSeq)) {
    pushAudit(id, stageFor(a.tool), describeAction(a), JSON.stringify(a.args).slice(0, 140));
  }
}

async function startWithAI(id: string, spec: ReturnType<typeof getPersona> & {}, opts: PulseOpts) {
  const customer = generateCustomer(spec);
  resetAudit(id);
  const scores = computeScores(customer);
  const consentLine = customer.consents.map((c) => `${c.purpose.split("_")[0]} ${c.granted ? "✓" : "✗"}`).join(" · ");
  pushAudit(id, "observe", `Session opened: ${customer.transactions.length} transactions on record; consent: ${consentLine}.`);

  const tone = bestToneForSegment(customer.segment);
  const agent = newSession(customer, toCtx(opts));
  const history: Content[] = [];
  const turn = await runAgentTurn(agent, history, null, tone);
  auditAgentActions(id, agent, 0);
  pushAudit(id, "learn", `Learned style hint applied: “${tone.label}” (policy's best for ${customer.segment}).`);

  const trace = agent.actions.map((a) => ({ tool: a.tool, label: describeAction(a) }));

  // agent chose silence
  if (!agent.outbound && !agent.suppressed) {
    pushAudit(id, "decide", "Agent decided to stay silent.", turn.silentNote ?? "");
    return {
      ...customerSummaryLite(customer), ai: true, journey: null,
      reason: turn.silentNote ?? "Agent found no helpful reason to engage.",
      scores, delivered: false, trace,
      governance: { verdict: "suppressed", reasons: ["Agent decision: no genuinely helpful reason to reach out."] },
      audit: getAudit(id),
    };
  }

  // gate blocked the outbound (the tool itself refused)
  if (agent.suppressed) {
    aiSessions.delete(id);
    return {
      ...customerSummaryLite(customer), ai: true, journey: null,
      reason: "Agent attempted an outbound message; the deterministic gate refused it.",
      scores, delivered: false, trace,
      governance: agent.suppressed.governance, audit: getAudit(id),
    };
  }

  const out = agent.outbound!;
  pushAudit(id, "deliver", `Delivered agent message in ${customer.preferredLanguage} (${out.isCare ? "care" : "engagement"}).`);
  aiSessions.set(id, {
    agent, history, language: customer.preferredLanguage, segment: customer.segment,
    toneId: tone.id, toneLabel: tone.label, status: out.complete ? "completed" : "active",
  });

  return {
    ...customerSummaryLite(customer), ai: true,
    journey: { id: "agentic", name: out.isCare ? "Care conversation" : "Engagement conversation", emoji: out.isCare ? "🛡️" : "✨", goal: "decided live by the agent", isCare: out.isCare },
    reason: `Agent investigated with ${trace.filter((t) => t.tool.startsWith("get_")).length} tool calls, then chose to engage.`,
    scores, governance: out.governance, delivered: true, trace,
    step: {
      id: "ai", kind: out.isCare ? "care" : "insight", channel: out.isCare ? "yono_card" : "whatsapp",
      language: customer.preferredLanguage, title: out.title, body: out.message,
      options: out.quickReplies.map((q) => ({ label: q, choice: q })), terminal: out.complete,
    },
    status: out.complete ? "completed" : "active", audit: getAudit(id),
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
    fallbackMode: true, // rule engine — never presented as AI
    audit: getAudit(id),
  };
}

/** Forecast payload for the chart (real model output incl. validation). */
export function forecastFor(id: string) {
  const spec = getPersona(id);
  if (!spec) return null;
  const customer = generateCustomer(spec);
  if (customer.transactions.length < 20) return { available: false };
  const f = forecast(customer);
  return {
    available: true,
    history: f.history.filter((_, i) => i % 2 === 0),
    projected: f.projected,
    validation: f.validation,
    minProjected: f.minProjected,
    lowBalanceEvent: f.lowBalanceEvent,
    driftPerDay: f.driftPerDay,
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
  pushAudit(id, "reply", `Customer: “${userText}”.`);
  const before = session.agent.seq;
  try {
    const turn = await runAgentTurn(session.agent, session.history, userText);
    auditAgentActions(id, session.agent, before);

    const out = session.agent.outbound;
    const isCare = out?.isCare ?? true;
    const trace = session.agent.actions.filter((a) => a.at > before).map((a) => ({ tool: a.tool, label: describeAction(a) }));

    if (!out) {
      // gate refusal mid-conversation or silence — close gracefully
      session.status = "completed"; session.outcome = "declined";
      return { ai: true, trace, step: null, status: "completed", outcome: "declined", reward: { kind: "soft" }, audit: getAudit(id) };
    }

    let reward: null | { kind: "positive" | "rm" | "soft"; outcome?: string } = null;
    if (out.complete && out.outcome !== "ongoing") {
      session.status = "completed"; session.outcome = out.outcome;
      reward = out.outcome === "positive" ? { kind: "positive", outcome: out.outcome }
        : out.outcome === "rm_handoff" ? { kind: "rm", outcome: out.outcome }
        : { kind: "soft", outcome: out.outcome };
      pushAudit(id, "complete", `Conversation completed — outcome: ${out.outcome}.`);
      // FLYWHEEL: real outcome → policy
      const rewardBit: 0 | 1 = out.outcome === "positive" ? 1 : 0;
      recordOutcome("agentic", session.segment, session.toneId, rewardBit);
      pushAudit(id, "learn", `Outcome fed back to policy — “${session.toneLabel}” style, reward ${rewardBit}. Posterior updated.`);
    }

    return {
      ai: true, trace,
      step: {
        id: "ai", kind: isCare ? "care" : (out.complete && out.outcome === "positive" ? "celebrate" : "insight"),
        channel: isCare ? "yono_card" : "whatsapp", language: session.language,
        title: out.title, body: out.message,
        options: out.complete ? [] : out.quickReplies.map((q) => ({ label: q, choice: q })),
        terminal: out.complete,
      },
      status: session.status, outcome: session.outcome ?? null, reward, audit: getAudit(id),
    };
  } catch (e) {
    pushAudit(id, "warn", `Agent turn failed (${String(e).slice(0, 50)}).`);
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
