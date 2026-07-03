import type { Customer, GovernanceResult } from "../domain.ts";
import type { FunctionDecl } from "./gemini.ts";
import { computeScores } from "../engagement/scores.ts";
import { forecast } from "../ml/forecaster.ts";
import { checkContactPolicy, type GateContext } from "../governance/consentGate.ts";

// ---------------------------------------------------------------------------
// The agent's banking tools. Every handler is REAL code acting on real session
// state. Design rule: the outbound-message tool contains the deterministic
// governance gate INSIDE its handler — the model is physically unable to send
// an ungated message. Policy is not a suggestion; it is the API.
// ---------------------------------------------------------------------------

export interface AgentAction {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  at: number; // sequence
}

export interface AgentSession {
  customer: Customer;
  gateCtx: GateContext;
  actions: AgentAction[];
  /** Set when respond_to_customer succeeds — ends the ReAct loop. */
  outbound: null | {
    title: string; message: string; quickReplies: string[];
    complete: boolean; outcome: string; isCare: boolean;
    governance: GovernanceResult;
  };
  /** Set when the gate suppressed the outbound. */
  suppressed: null | { governance: GovernanceResult };
  seq: number;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// ---- declarations the model sees -------------------------------------------

export const TOOL_DECLS: FunctionDecl[] = [
  {
    name: "get_customer_profile",
    description: "Fetch the customer's profile: age, city, segment, preferred language, and consent status.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_spending_breakdown",
    description: "Debits grouped by category for each of the last 3 months, plus income per month. Use to understand where money goes and how it is trending.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_cashflow_forecast",
    description: "Run the trained cash-flow model: 30-day balance projection, detected recurring flows, projected minimum balance, any low-balance event, and the model's own holdout validation (skill vs naive — if skill is low or negative, do not rely on the projection).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_engagement_analytics",
    description: "Rule-based analytics features (not AI): engagement score, financial-health score, churn and dormancy risk, days since last activity.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "create_sip",
    description: "Create a monthly SIP (systematic investment plan) for the customer. Only after the customer explicitly agrees in conversation.",
    parameters: { type: "object", properties: { amountInr: { type: "number", description: "monthly amount in INR" } }, required: ["amountInr"] },
  },
  {
    name: "set_spend_cap",
    description: "Set a soft monthly discretionary-spend cap with weekly progress alerts. Only after the customer agrees.",
    parameters: { type: "object", properties: { amountInr: { type: "number" } }, required: ["amountInr"] },
  },
  {
    name: "schedule_reminder",
    description: "Schedule a follow-up nudge N days from now (e.g. before a predicted low-balance date, or next payday).",
    parameters: { type: "object", properties: { inDays: { type: "number" }, note: { type: "string" } }, required: ["inDays", "note"] },
  },
  {
    name: "escalate_to_rm",
    description: "Hand off to a human relationship manager with a written brief. REQUIRED for high-value products: loans, insurance, restructuring.",
    parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
  {
    name: "respond_to_customer",
    description:
      "Send your message to the customer. This tool runs the bank's deterministic compliance gate (consent, TRAI contact window, frequency caps) — if the gate rejects, you will get a refusal with reasons and must stop. " +
      "Write title+message in the customer's preferred language. isCare=true for support/help conversations (never selling). Set complete=true with an outcome when the engagement has reached a natural end.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        message: { type: "string" },
        quickReplies: { type: "array", items: { type: "string" }, description: "2-3 short reply options in the customer's language; empty if complete" },
        isCare: { type: "boolean" },
        complete: { type: "boolean" },
        outcome: { type: "string", enum: ["ongoing", "positive", "declined", "rm_handoff"] },
      },
      required: ["title", "message", "quickReplies", "isCare", "complete", "outcome"],
    },
  },
];

// ---- handlers ---------------------------------------------------------------

export function executeTool(session: AgentSession, name: string, args: Record<string, unknown>): unknown {
  const c = session.customer;
  let result: unknown;

  switch (name) {
    case "get_customer_profile":
      result = {
        name: c.name, age: c.age, city: c.homeCity, segment: c.segment,
        preferredLanguage: { en: "English", hi: "Hindi", or: "Odia" }[c.preferredLanguage],
        consents: c.consents.map((x) => ({ purpose: x.purpose, granted: x.granted })),
        transactionCount: c.transactions.length,
      };
      break;

    case "get_spending_breakdown": {
      const months = new Map<string, { debitsByCategory: Record<string, number>; income: number }>();
      for (const t of c.transactions) {
        const m = t.date.slice(0, 7);
        const agg = months.get(m) ?? { debitsByCategory: {}, income: 0 };
        if (t.direction === "debit") agg.debitsByCategory[t.category] = Math.round((agg.debitsByCategory[t.category] ?? 0) + t.amount);
        else if (t.category === "salary" || t.category === "pension") agg.income += t.amount;
        months.set(m, agg);
      }
      result = [...months.entries()].slice(-3).map(([month, v]) => ({ month, income: Math.round(v.income), ...{ debits: v.debitsByCategory } }));
      break;
    }

    case "get_cashflow_forecast": {
      if (c.transactions.length < 20) { result = { error: "insufficient history for a forecast" }; break; }
      const f = forecast(c);
      result = {
        currentBalance: c.transactions[c.transactions.length - 1].balanceAfter,
        projectedMin30d: f.minProjected,
        driftPerDay: f.driftPerDay,
        lowBalanceEvent: f.lowBalanceEvent,
        largestRecurringFlows: f.recurring.slice(0, 5).map((r) => `${r.direction} ${inr(r.amount)} ~day ${r.dayOfMonth} (${r.category})`),
        modelValidation: {
          holdoutDays: f.validation.holdoutDays,
          maeModel: f.validation.maeModel,
          maeNaiveBaseline: f.validation.maeNaive,
          skillPct: f.validation.skill,
          note: f.validation.skill < 20 ? "LOW CONFIDENCE — do not rely on this projection" : "model beats naive baseline",
        },
      };
      break;
    }

    case "get_engagement_analytics":
      result = computeScores(c);
      break;

    case "create_sip":
      result = { ok: true, sipId: `SIP-${c.id.toUpperCase()}-${1000 + session.seq}`, monthlyInr: args.amountInr, status: "active (simulated core-banking call)" };
      break;

    case "set_spend_cap":
      result = { ok: true, capInr: args.amountInr, alerts: "weekly", status: "active (simulated core-banking call)" };
      break;

    case "schedule_reminder":
      result = { ok: true, scheduledInDays: args.inDays, note: args.note, status: "queued (simulated)" };
      break;

    case "escalate_to_rm":
      result = { ok: true, ticket: `RM-${1000 + session.seq}`, reason: args.reason, sla: "24h callback (simulated)" };
      break;

    case "respond_to_customer": {
      // THE GATE LIVES HERE. The model cannot bypass it.
      const isCare = !!args.isCare;
      const governance = checkContactPolicy(c, { isCare, ctx: session.gateCtx });
      if (governance.verdict !== "approved") {
        session.suppressed = { governance };
        result = { sent: false, gateVerdict: governance.verdict, reasons: governance.reasons, instruction: "Message blocked by policy. Do not retry. End your turn." };
      } else {
        session.outbound = {
          title: String(args.title ?? ""), message: String(args.message ?? ""),
          quickReplies: Array.isArray(args.quickReplies) ? (args.quickReplies as string[]).slice(0, 3) : [],
          complete: !!args.complete, outcome: String(args.outcome ?? "ongoing"), isCare, governance,
        };
        result = { sent: true, gateVerdict: "approved" };
      }
      break;
    }

    default:
      result = { error: `unknown tool ${name}` };
  }

  session.seq += 1;
  session.actions.push({ tool: name, args, result, at: session.seq });
  return result;
}
