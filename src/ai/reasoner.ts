import type { Customer, LanguageCode } from "../domain.ts";
import { computeScores } from "../engagement/scores.ts";
import { JOURNEYS } from "../journeys/definitions.ts";
import { generateJSON } from "./gemini.ts";

// ---------------------------------------------------------------------------
// The reasoning agent — the real "agentic AI" core.
// It reads the customer's ACTUAL transaction stream and reasons about what to
// do: infers the situation, DECIDES the engagement (or to stay silent), and
// writes the vernacular message. The deterministic guardrail gate still
// governs whether it may be delivered (LLM proposes, policy disposes).
// ---------------------------------------------------------------------------

const LANG_NAME: Record<LanguageCode, string> = { en: "English", hi: "Hindi", or: "Odia" };

const ALLOWED = Object.values(JOURNEYS)
  .map((j) => `- ${j.id}: ${j.goal}${j.isCare ? " (CARE — never sell here)" : ""}`)
  .join("\n");

const JOURNEY_IDS = [...Object.keys(JOURNEYS), "none"];

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Compact, grounded profile: real numbers + recent transactions for the model to read. */
function buildProfile(customer: Customer): string {
  const s = computeScores(customer);
  const txns = customer.transactions;
  const recent = txns.slice(-14).map((t) =>
    `${t.date}  ${t.direction === "credit" ? "+" : "-"}${inr(t.amount)}  ${t.category}  ${t.merchant}`,
  ).join("\n");

  const debitsByCat: Record<string, number> = {};
  for (const t of txns) if (t.direction === "debit") debitsByCat[t.category] = (debitsByCat[t.category] ?? 0) + t.amount;
  const topSpend = Object.entries(debitsByCat).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([c, v]) => `${c} ${inr(v)}`).join(", ");

  return [
    `Customer: ${customer.name}, age ${customer.age}, ${customer.homeCity}, segment ${customer.segment}, language ${LANG_NAME[customer.preferredLanguage]}.`,
    `Engagement score ${s.engagement}/100, financial-health ${s.financialHealth}/100, churn-risk ${s.churnRisk}, dormancy-risk ${s.dormancyRisk}.`,
    `Savings rate ${s.savingsRatePct}%, ${s.daysSinceLastTxn} days since last activity, active in ${s.activeMonths}/6 months.`,
    s.drivers.length ? `Signals: ${s.drivers.join("; ")}.` : "",
    `Top spend: ${topSpend || "n/a"}.`,
    `Recent transactions:\n${recent}`,
  ].filter(Boolean).join("\n");
}

// ---- schemas --------------------------------------------------------------

const REASON_SCHEMA = {
  type: "object",
  properties: {
    situation: { type: "string", description: "1-2 line read of the customer's financial life" },
    journeyId: { type: "string", enum: JOURNEY_IDS },
    confidence: { type: "number" },
    reasoning: { type: "string", description: "why this engagement, grounded in the data" },
    title: { type: "string" },
    message: { type: "string", description: "the opening message, in the customer's language" },
    quickReplies: { type: "array", items: { type: "string" } },
  },
  required: ["situation", "journeyId", "confidence", "reasoning", "title", "message", "quickReplies"],
};

const TURN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    message: { type: "string" },
    quickReplies: { type: "array", items: { type: "string" } },
    complete: { type: "boolean" },
    outcome: { type: "string", enum: ["positive", "declined", "rm_handoff", "ongoing"] },
  },
  required: ["message", "quickReplies", "complete", "outcome"],
};

export interface EngagementDecision {
  situation: string;
  journeyId: string;
  confidence: number;
  reasoning: string;
  title: string;
  message: string;
  quickReplies: string[];
}

const SYSTEM_BASE =
  "You are SBI Pulse, a proactive, wellness-first customer-engagement agent for State Bank of India. " +
  "You engage customers with genuinely helpful, respectful, non-pushy messages. Core rules: " +
  "(1) If the customer shows financial stress, NEVER sell a product — choose the care path and offer help. " +
  "(2) Prefer helping over selling; earn engagement, don't force it. " +
  "(3) Keep messages to 1-2 short sentences, warm and human. " +
  "(4) Write the title, message and quickReplies in the customer's language. " +
  "(5) Be truthful and grounded strictly in the data you are given.";

export async function reasonEngagement(
  customer: Customer,
  tone?: { label: string; hint: string },
): Promise<EngagementDecision> {
  const profile = buildProfile(customer);
  const toneLine = tone
    ? `\nThe engagement policy has learned this customer's segment responds best to a "${tone.label}" style — write the message that way (${tone.hint}).`
    : "";
  const user =
    `Here is a customer's profile and real recent transactions:\n\n${profile}\n\n` +
    `Decide the single best proactive engagement. Choose one journeyId from:\n${ALLOWED}\n- none: if there is no confident, helpful reason to reach out.${toneLine}\n\n` +
    `Return the situation you infer, the chosen journeyId, your confidence (0-1), your reasoning, and a warm opening message (title + message + 2-3 quickReplies) in ${LANG_NAME[customer.preferredLanguage]}.`;

  return generateJSON<EngagementDecision>({ system: SYSTEM_BASE, user, schema: REASON_SCHEMA, temperature: 0.45, maxTokens: 700 });
}

export interface TurnResult {
  title?: string;
  message: string;
  quickReplies: string[];
  complete: boolean;
  outcome: "positive" | "declined" | "rm_handoff" | "ongoing";
}

export async function continueConversation(
  customer: Customer,
  journeyGoal: string,
  isCare: boolean,
  history: Array<{ role: "assistant" | "user"; text: string }>,
  userText: string,
): Promise<TurnResult> {
  const convo = history.map((h) => `${h.role === "assistant" ? "Pulse" : customer.name.split(" ")[0]}: ${h.text}`).join("\n");
  const user =
    `You are running an engagement journey with goal: "${journeyGoal}"${isCare ? " (this is a CARE conversation — never sell)" : ""}.\n\n` +
    `Conversation so far:\n${convo}\n${customer.name.split(" ")[0]}: ${userText}\n\n` +
    `Reply as Pulse in ${LANG_NAME[customer.preferredLanguage]}. ` +
    `If the customer agrees to an action, confirm warmly and set complete=true, outcome="positive". ` +
    `If they decline or want to stop, gracefully close, complete=true, outcome="declined". ` +
    `If it needs a big-ticket product (loan/insurance), hand off: complete=true, outcome="rm_handoff". ` +
    `Otherwise continue helpfully, complete=false, outcome="ongoing". Offer 2-3 quickReplies.`;

  return generateJSON<TurnResult>({ system: SYSTEM_BASE, user, schema: TURN_SCHEMA, temperature: 0.5, maxTokens: 500 });
}
