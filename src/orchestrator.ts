import type { Customer, Decision } from "./domain.ts";
import { inferLifeEvents, primaryEvent } from "./agents/signalAgent.ts";
import { rankActions } from "./agents/nbaAgent.ts";
import { personalize } from "./agents/personalizationAgent.ts";
import { evaluate, DEFAULT_CONTEXT, type GateContext } from "./governance/consentGate.ts";
import { Ledger } from "./governance/ledger.ts";
import { DEMO_NOW } from "./data/generator.ts";

// ---------------------------------------------------------------------------
// Orchestrator — runs the per-customer agentic loop:
//   OBSERVE → INFER → DECIDE → GATE → ACT → LEARN
// Sequences the specialist agents, enforces the governance gate between DECIDE
// and ACT, and writes an explainability entry at every stage.
// ---------------------------------------------------------------------------

export interface RunResult {
  decision: Decision;
  ledger: Ledger;
  allHypotheses: ReturnType<typeof inferLifeEvents>;
  candidateActions: ReturnType<typeof rankActions>;
}

export async function runForCustomer(
  customer: Customer,
  ctx: GateContext = DEFAULT_CONTEXT,
): Promise<RunResult> {
  const ledger = new Ledger();

  // 1. OBSERVE
  ledger.record(customer.id, "observe", `Observed ${customer.transactions.length} transactions over ~6 months.`, {
    homeCity: customer.homeCity,
    segment: customer.segment,
    consents: customer.consents.map((c) => `${c.purpose}:${c.granted ? "granted" : "withheld"}`),
  });

  // 2. INFER
  const hyps = inferLifeEvents(customer);
  ledger.record(customer.id, "infer", `Inferred ${hyps.length} life-event hypothes${hyps.length === 1 ? "is" : "es"}.`, {
    hypotheses: hyps.map((h) => `${h.type} (${Math.round(h.confidence * 100)}%)`),
  });

  const event = primaryEvent(hyps);

  if (!event) {
    const decision: Decision = {
      customerId: customer.id,
      event: { type: "financial_stress", confidence: 0, evidence: [], facts: {} },
      governance: { verdict: "suppressed", reasons: ["No confident life event detected — agent stays silent."] },
      rmHandoffs: [],
      timestamp: `${DEMO_NOW}T09:00:00`,
    };
    ledger.record(customer.id, "decide", "No confident event — no action taken.");
    return { decision, ledger, allHypotheses: hyps, candidateActions: [] };
  }

  ledger.record(customer.id, "decide", `Primary event: ${event.type} (${Math.round(event.confidence * 100)}%).`, {
    evidence: event.evidence,
    facts: event.facts,
  });

  // 3. DECIDE — split into a light-touch proactive nudge vs high-value RM handoffs.
  //    A bank should auto-send the small, useful nudge and escalate big-ticket
  //    products (loans, insurance) to a human relationship manager — not blast them.
  const actions = rankActions(customer, event);
  const proactive = actions.find((a) => !a.product.highValue);
  const rmHandoffs = actions.filter((a) => a.product.highValue);
  ledger.record(customer.id, "decide", proactive ? `Proactive nudge: ${proactive.product.name}.` : "No light-touch action.", {
    ranked: actions.map((a) => `${a.product.name} (${a.score})${a.product.highValue ? " [RM]" : ""}`),
    rmHandoffs: rmHandoffs.map((a) => a.product.name),
  });

  // 4. GATE (evaluates the proactive nudge)
  const governance = evaluate(customer, event, proactive, ctx);
  ledger.record(customer.id, "gate", `Governance verdict: ${governance.verdict}.`, { reasons: governance.reasons });
  if (rmHandoffs.length) {
    ledger.record(customer.id, "gate", `${rmHandoffs.length} high-value action(s) escalated to relationship manager.`, {
      actions: rmHandoffs.map((a) => a.product.name),
    });
  }

  // 5. ACT (only if approved)
  let message;
  if (governance.verdict === "approved" && proactive && governance.channel) {
    message = await personalize(customer, event, proactive, governance.channel);
    ledger.record(customer.id, "act", `Sent ${message.channel} message in '${message.language}'.`, {
      title: message.title,
      whyThis: message.whyThis,
    });
  } else {
    ledger.record(customer.id, "act", `No proactive message sent (${governance.verdict}).`);
  }

  // 6. LEARN (placeholder — production would fold outcome back into thresholds)
  ledger.record(customer.id, "learn", "Outcome logged for threshold/feedback learning.", {
    verdict: governance.verdict,
  });

  const decision: Decision = {
    customerId: customer.id,
    event,
    action: proactive,
    governance,
    message,
    rmHandoffs,
    timestamp: `${DEMO_NOW}T${String(ctx.nowHour).padStart(2, "0")}:00:00`,
  };
  return { decision, ledger, allHypotheses: hyps, candidateActions: actions };
}
