import type {
  Customer,
  LifeEventHypothesis,
  RankedAction,
  GovernanceResult,
  Channel,
  ConsentPurpose,
} from "../domain.ts";

// ---------------------------------------------------------------------------
// Governance / Consent Gate — DELIBERATELY DETERMINISTIC (no LLM).
// A bank auditor must be able to read this file and know exactly when a customer
// will and won't be contacted. The LLM proposes; this code disposes.
//
// Enforces, in order:
//   1. DPDP purpose-scoped consent (behavioural analysis to infer at all)
//   2. Care-vs-marketing distinction (stress help is service, not UCC)
//   3. Marketing consent for any cross-sell (DPDP + TRAI)
//   4. TRAI TCCCPR contact window (9am–9pm) + DND
//   5. Frequency cap (anti-fatigue)
//   6. Human-in-the-loop for high-value actions
// ---------------------------------------------------------------------------

export interface GateContext {
  /** Hour of day (0–23) at evaluation time — drives the TRAI window check. */
  nowHour: number;
  /** How many proactive contacts this customer already got in the rolling window. */
  recentContacts: number;
  /** Max proactive contacts allowed per rolling window. */
  frequencyCap: number;
}

export const DEFAULT_CONTEXT: GateContext = {
  nowHour: 11,
  recentContacts: 0,
  frequencyCap: 2,
};

export function hasConsent(customer: Customer, purpose: ConsentPurpose): boolean {
  const c = customer.consents.find((x) => x.purpose === purpose);
  return !!c && c.granted && !c.revokedAt;
}

/**
 * Generic outbound-contact policy — the reusable compliance spine shared by both
 * one-off next-best-actions and multi-step journeys. Deterministic by design.
 */
export function checkContactPolicy(
  customer: Customer,
  opts: { isCare: boolean; ctx?: GateContext },
): GovernanceResult {
  const ctx = opts.ctx ?? DEFAULT_CONTEXT;
  const reasons: string[] = [];

  if (!hasConsent(customer, "behavioural_analysis")) {
    return { verdict: "suppressed", reasons: ["No behavioural-analysis consent (DPDP): engagement withheld."] };
  }
  if (!opts.isCare && !hasConsent(customer, "proactive_marketing")) {
    return {
      verdict: "suppressed",
      reasons: ["Proactive-marketing consent not granted (DPDP/TRAI): outreach suppressed; insight kept in-app only."],
    };
  }
  if (opts.isCare) reasons.push("Classified as customer-care (service), not marketing — exempt from UCC consent.");

  const win = customer.contactWindow ?? { startHour: 9, endHour: 21 };
  if (ctx.nowHour < win.startHour || ctx.nowHour >= win.endHour) {
    return { verdict: "suppressed", reasons: [`Outside TRAI window (${win.startHour}:00–${win.endHour}:00); queued for next slot.`] };
  }
  reasons.push(`Within TRAI window (${win.startHour}:00–${win.endHour}:00).`);

  if (ctx.recentContacts >= ctx.frequencyCap) {
    return { verdict: "suppressed", reasons: [`Frequency cap reached (${ctx.recentContacts}/${ctx.frequencyCap}): suppressed to avoid fatigue.`] };
  }
  reasons.push(`Under frequency cap (${ctx.recentContacts}/${ctx.frequencyCap}).`);
  reasons.push("Consent, window and frequency satisfied — approved.");
  return { verdict: "approved", reasons, channel: opts.isCare ? "yono_card" : "whatsapp" };
}

export function evaluate(
  customer: Customer,
  event: LifeEventHypothesis,
  action: RankedAction | undefined,
  ctx: GateContext = DEFAULT_CONTEXT,
): GovernanceResult {
  const reasons: string[] = [];

  // 1. Must have behavioural-analysis consent to have inferred anything.
  if (!hasConsent(customer, "behavioural_analysis")) {
    return { verdict: "suppressed", reasons: ["No behavioural-analysis consent (DPDP): inference & contact withheld."] };
  }

  const isCare = event.type === "financial_stress";

  // 2/3. Marketing needs marketing consent; a care/service nudge does not (it is
  //      not Unsolicited Commercial Communication under TRAI).
  if (!isCare && !hasConsent(customer, "proactive_marketing")) {
    return {
      verdict: "suppressed",
      reasons: [
        "Proactive-marketing consent not granted (DPDP §6 / TRAI TCCCPR): cross-sell outreach suppressed.",
        "Insight retained in-app for pull-based discovery only.",
      ],
    };
  }
  if (isCare) reasons.push("Classified as customer-care (service), not marketing — exempt from UCC consent.");

  // 4. TRAI contact window (9am–9pm) + customer DND window.
  const win = customer.contactWindow ?? { startHour: 9, endHour: 21 };
  if (ctx.nowHour < win.startHour || ctx.nowHour >= win.endHour) {
    return {
      verdict: "suppressed",
      reasons: [`Outside TRAI contact window (${win.startHour}:00–${win.endHour}:00); queued for next allowed slot.`],
    };
  }
  reasons.push(`Within TRAI contact window (${win.startHour}:00–${win.endHour}:00).`);

  // 5. Frequency cap.
  if (ctx.recentContacts >= ctx.frequencyCap) {
    return {
      verdict: "suppressed",
      reasons: [`Frequency cap reached (${ctx.recentContacts}/${ctx.frequencyCap} in window): suppressed to avoid fatigue.`],
    };
  }
  reasons.push(`Under frequency cap (${ctx.recentContacts}/${ctx.frequencyCap}).`);

  if (!action) {
    return { verdict: "suppressed", reasons: [...reasons, "No eligible action for this event."] };
  }

  // 6. High-value actions go to a human relationship manager.
  if (action.product.highValue) {
    return {
      verdict: "deferred_to_human",
      reasons: [...reasons, `High-value action (${action.product.name}) routed to a relationship manager with the agent's brief.`],
      channel: "voice",
    };
  }

  const channel: Channel = isCare ? "yono_card" : "whatsapp";
  reasons.push("Consent, window and frequency all satisfied — approved.");
  return { verdict: "approved", reasons, channel };
}
