import type { Customer } from "../domain.ts";
import type { GateContext } from "../governance/consentGate.ts";
import { generateWithTools, generateJSON, toolResponses, type Content, type FunctionDecl } from "./gemini.ts";
import { TOOL_DECLS, executeTool, type AgentSession } from "./tools.ts";
import { newSession } from "./agent.ts";

// ---------------------------------------------------------------------------
// The Pulse Agent Mesh — multi-agent orchestration, dependency-free.
//
//   4 specialist LLM agents run IN PARALLEL (true Promise.all fan-out), each
//   with its own role and its own restricted tool access; each must ground its
//   report in tool results. An LLM ORCHESTRATOR then synthesizes the four
//   reports and decides: engage / care / stay silent — and writes the brief
//   the conversation agent executes.
//
//   This is the CBA pattern in miniature: many analysts per decision, one
//   decisioning brain, milliseconds of wall-clock bought via parallelism.
// ---------------------------------------------------------------------------

export interface SpecialistReport {
  agent: string;
  emoji: string;
  headline: string;
  findings: string[];
  concern: "none" | "low" | "medium" | "high";
  ms: number;
  toolsUsed: string[];
}

interface SpecialistDef {
  id: string;
  emoji: string;
  role: string;
  tools: string[]; // subset of TOOL_DECLS names this agent may use
}

const SPECIALISTS: SpecialistDef[] = [
  {
    id: "Spending Analyst",
    emoji: "🧾",
    role: "You analyse spending behaviour: category mix, month-over-month trends, lifestyle creep, savings rate. Flag sustained changes, not one-offs.",
    tools: ["get_spending_breakdown", "get_customer_profile"],
  },
  {
    id: "Cash-flow Analyst",
    emoji: "📈",
    role: "You assess liquidity: run the cash-flow model and interpret its projection AND its holdout validation. If model skill is low, say the projection is unreliable. Flag any predicted low-balance event with its lead time.",
    tools: ["get_cashflow_forecast", "get_customer_profile"],
  },
  {
    id: "Risk & Consent Analyst",
    emoji: "⚖️",
    role: "You assess relationship risk and compliance posture: churn/dormancy risk, engagement level, and exactly which consents are granted or withheld. State plainly what outreach the consent posture permits.",
    tools: ["get_engagement_analytics", "get_customer_profile"],
  },
  {
    id: "Product-Fit Analyst",
    emoji: "🎯",
    role: "You identify which banking actions would GENUINELY help this customer (SIP, spend cap, reminders, RM consultation for loans/insurance/restructuring) — and which must be avoided (never sell to a stressed customer). Rank at most 2 helpful actions.",
    tools: ["get_spending_breakdown", "get_engagement_analytics", "get_customer_profile"],
  },
];

const REPORT_TOOL: FunctionDecl = {
  name: "submit_report",
  description: "Submit your final analyst report. Call this exactly once, when your analysis is complete.",
  parameters: {
    type: "object",
    properties: {
      headline: { type: "string", description: "one-line summary of your key finding" },
      findings: { type: "array", items: { type: "string" }, description: "2-4 short bullet findings, grounded in tool data" },
      concern: { type: "string", enum: ["none", "low", "medium", "high"] },
    },
    required: ["headline", "findings", "concern"],
  },
};

async function runSpecialist(def: SpecialistDef, customer: Customer, gateCtx: GateContext): Promise<SpecialistReport> {
  const t0 = Date.now();
  const session = newSession(customer, gateCtx);
  const tools = [...TOOL_DECLS.filter((t) => def.tools.includes(t.name)), REPORT_TOOL];
  const system = `You are the ${def.id} on SBI Pulse's engagement mesh. ${def.role}\nGround every finding in tool results — never invent numbers. Use your tools first, then submit_report exactly once.`;
  const history: Content[] = [{ role: "user", parts: [{ text: `Analyse customer "${customer.id}" and submit your report.` }] }];

  let report: { headline: string; findings: string[]; concern: SpecialistReport["concern"] } | null = null;
  const used: string[] = [];

  for (let step = 0; step < 4 && !report; step++) {
    const turn = await generateWithTools({ system, contents: history, tools, temperature: 0.1, maxTokens: 700 });
    if (!turn.toolCalls.length) break; // gave up without a report — handled below
    history.push(turn.modelContent!);
    const results = turn.toolCalls.map((call) => {
      if (call.name === "submit_report") {
        report = {
          headline: String(call.args.headline ?? ""),
          findings: Array.isArray(call.args.findings) ? (call.args.findings as string[]).slice(0, 4) : [],
          concern: (["none", "low", "medium", "high"].includes(String(call.args.concern)) ? call.args.concern : "low") as SpecialistReport["concern"],
        };
        return { name: call.name, response: { accepted: true } };
      }
      used.push(call.name);
      return { name: call.name, response: executeTool(session, call.name, call.args) };
    });
    history.push(toolResponses(results));
  }

  return {
    agent: def.id,
    emoji: def.emoji,
    headline: report?.headline ?? "No report submitted.",
    findings: report?.findings ?? [],
    concern: report?.concern ?? "low",
    ms: Date.now() - t0,
    toolsUsed: [...new Set(used)],
  };
}

// ---- orchestrator -----------------------------------------------------------

export interface OrchestratorDecision {
  engage: boolean;
  mode: "care" | "growth" | "none";
  rationale: string;
  brief: string; // instructions handed to the conversation agent
}

const DECISION_SCHEMA = {
  type: "object",
  properties: {
    engage: { type: "boolean" },
    mode: { type: "string", enum: ["care", "growth", "none"] },
    rationale: { type: "string", description: "why, referencing the analysts' findings" },
    brief: { type: "string", description: "if engaging: a 2-4 sentence brief for the conversation agent — what to lead with, what to offer, what to avoid. Empty if not engaging." },
  },
  required: ["engage", "mode", "rationale", "brief"],
};

export interface MeshResult {
  reports: SpecialistReport[];
  decision: OrchestratorDecision;
  parallelMs: number; // wall-clock for the fan-out
  sequentialMs: number; // what it would have cost serially
  orchestratorMs: number;
}

export async function runMesh(customer: Customer, gateCtx: GateContext): Promise<MeshResult> {
  const t0 = Date.now();
  // TRUE parallel fan-out — wall-clock ≈ slowest specialist, not the sum.
  const reports = await Promise.all(SPECIALISTS.map((d) => runSpecialist(d, customer, gateCtx)));
  const parallelMs = Date.now() - t0;
  const sequentialMs = reports.reduce((s, r) => s + r.ms, 0);

  const t1 = Date.now();
  const reportText = reports
    .map((r) => `${r.agent} (concern: ${r.concern}): ${r.headline}\n${r.findings.map((f) => `  - ${f}`).join("\n")}`)
    .join("\n\n");

  const decision = await generateJSON<OrchestratorDecision>({
    system:
      "You are the Orchestrator of SBI Pulse's engagement mesh. Four specialist analysts report to you. Decide whether to engage this customer now, and how. " +
      "Rules: financial stress or predicted liquidity trouble → mode 'care' (help only, never sell). Genuine opportunity to help a healthy customer come out ahead → 'growth'. " +
      "No helpful reason, or consent posture forbids it → engage=false, mode 'none'. Silence is a respectable decision. Be decisive and reference the analysts.",
    user: `Customer: ${customer.name} (${customer.segment}, ${customer.homeCity}).\n\nAnalyst reports:\n\n${reportText}\n\nDecide.`,
    schema: DECISION_SCHEMA,
    temperature: 0.15,
    maxTokens: 500,
  });

  return { reports, decision, parallelMs, sequentialMs, orchestratorMs: Date.now() - t1 };
}
