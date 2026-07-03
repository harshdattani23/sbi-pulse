import type { Customer } from "../domain.ts";
import type { GateContext } from "../governance/consentGate.ts";
import { generateWithTools, toolResponses, type Content } from "./gemini.ts";
import { TOOL_DECLS, executeTool, type AgentSession, type AgentAction } from "./tools.ts";

// ---------------------------------------------------------------------------
// The ReAct agent loop — reason → call tools → observe → repeat, until the
// agent speaks via respond_to_customer (whose handler enforces the gate) or
// decides to stay silent. Every decision here is made by the model.
// ---------------------------------------------------------------------------

const MAX_STEPS = 8;

const SYSTEM = `You are Pulse, State Bank of India's proactive engagement agent. You decide autonomously whether and how to engage one customer, using tools.

OPERATING PRINCIPLES
1. INVESTIGATE FIRST. Always ground yourself with tools (profile, spending, cash-flow forecast) before deciding anything. Never invent numbers — quote only what tools returned.
2. WELLNESS FIRST. If you find financial stress or a predicted low balance, your job is to HELP (care, budgeting, reminders, restructuring via RM) — never to sell. Selling to a struggling customer is forbidden.
3. SILENCE IS A VALID DECISION. If there is no genuinely helpful reason to reach out, do not send anything — just answer with a one-line internal note explaining why you stayed silent. But note: helping a financially HEALTHY customer come out ahead is also genuinely helpful — e.g. cutting interest by optimising loan repayment (snowball/avalanche), putting a clear surplus to work, or catching a predicted low balance before it bites. A sustained, sharp rise in discretionary spending that is eroding the savings rate (lifestyle creep) also merits one gentle, judgment-free heads-up.
4. EARN, DON'T PUSH. If the customer hesitates or declines, soften or step back gracefully. Never repeat a rejected pitch.
5. ACT ONLY WITH AGREEMENT. Use action tools (create_sip, set_spend_cap, …) only after the customer explicitly agrees in conversation. High-value products (loans, insurance, restructuring) must go through escalate_to_rm.
6. CHECK THE FORECAST MODEL'S CONFIDENCE. get_cashflow_forecast returns its own holdout validation; if skill is low, do not build your message on the projection.
7. SPEAK THE CUSTOMER'S LANGUAGE. Write title, message and quickReplies in their preferred language (from the profile). 1-2 short sentences, warm, human, never pushy.
8. To talk to the customer you MUST use respond_to_customer. It runs the bank's compliance gate; if it rejects, stop — do not retry.`;

export interface AgentTurnResult {
  session: AgentSession;
  history: Content[];
  /** model's internal note when it chose silence */
  silentNote: string | null;
  steps: number;
}

export function newSession(customer: Customer, gateCtx: GateContext): AgentSession {
  return { customer, gateCtx, actions: [], outbound: null, suppressed: null, seq: 0 };
}

/**
 * Run one agent turn (proactive bootstrap when userText is null, else a reply).
 * Mutates and returns the session + conversation history for continuity.
 */
export async function runAgentTurn(
  session: AgentSession,
  history: Content[],
  userText: string | null,
  toneHint?: { label: string; hint: string },
): Promise<AgentTurnResult> {
  const system = toneHint
    ? SYSTEM + `\n9. LEARNED STYLE: the bank's outcome-trained policy indicates this customer's segment responds best to a "${toneHint.label}" style (${toneHint.hint}). Prefer that style when you write.`
    : SYSTEM;
  session.outbound = null;
  session.suppressed = null;

  if (userText === null) {
    history.push({
      role: "user",
      parts: [{ text: `New proactive engagement cycle for customer id "${session.customer.id}". Investigate with tools, then decide: engage helpfully, or stay silent.` }],
    });
  } else {
    history.push({ role: "user", parts: [{ text: `Customer replies: "${userText}"` }] });
  }

  let silentNote: string | null = null;
  let steps = 0;

  for (; steps < MAX_STEPS; steps++) {
    const turn = await generateWithTools({ system, contents: history, tools: TOOL_DECLS, temperature: 0.1 });

    if (turn.toolCalls.length > 0) {
      history.push(turn.modelContent!);
      const results = turn.toolCalls.map((call) => ({
        name: call.name,
        response: executeTool(session, call.name, call.args),
      }));
      history.push(toolResponses(results));
      // message sent or suppressed → the turn is over
      if (session.outbound || session.suppressed) break;
      continue;
    }

    // plain text with no tool call = the agent chose silence (internal note)
    silentNote = turn.text ?? "(no note)";
    if (turn.modelContent) history.push(turn.modelContent);
    break;
  }

  return { session, history, silentNote, steps: steps + 1 };
}

/** Human-readable one-liners for the UI trace. */
export function describeAction(a: AgentAction): string {
  const r = a.result as Record<string, unknown> | undefined;
  switch (a.tool) {
    case "get_customer_profile": return "Fetched profile & consents";
    case "get_spending_breakdown": return "Analysed 3-month spending breakdown";
    case "get_cashflow_forecast": {
      const v = (r?.modelValidation ?? {}) as Record<string, unknown>;
      const low = r?.lowBalanceEvent as Record<string, unknown> | null;
      return `Ran cash-flow model (skill ${v.skillPct ?? "?"}%)` + (low ? ` → ⚠ low balance in ${low.inDays}d` : "");
    }
    case "get_engagement_analytics": return "Pulled engagement analytics";
    case "create_sip": return `Created SIP ${inrs(a.args.amountInr)}/month`;
    case "set_spend_cap": return `Set spend cap ${inrs(a.args.amountInr)}/month`;
    case "schedule_reminder": return `Scheduled follow-up in ${a.args.inDays} days`;
    case "escalate_to_rm": return "Escalated to relationship manager";
    case "respond_to_customer": {
      const sent = (r as { sent?: boolean } | undefined)?.sent;
      return sent ? "Message passed the gate → delivered" : "Message BLOCKED by compliance gate";
    }
    default: return a.tool;
  }
}
const inrs = (n: unknown) => "₹" + Number(n ?? 0).toLocaleString("en-IN");
