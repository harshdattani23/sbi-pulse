import { PERSONAS, getPersona } from "../data/personas.ts";
import { generateCustomer } from "../data/generator.ts";
import { runForCustomer } from "../orchestrator.ts";
import type { GateContext } from "../governance/consentGate.ts";

// ---------------------------------------------------------------------------
// Demo CLI — runs the agentic loop for one or all personas and prints the
// full reasoning trace. This is the "money shot" for the stage.
//
//   npm run demo            # all personas
//   npm run demo -- ravi    # a single persona
//   npm run demo -- --list  # list personas
//   npm run demo -- ravi --hour 22   # simulate out-of-window (TRAI) suppression
// ---------------------------------------------------------------------------

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  mag: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

const rule = (label = "") =>
  console.log(c.dim("─".repeat(4) + (label ? ` ${label} ` : "") + "─".repeat(Math.max(0, 66 - label.length))));

function verdictColor(v: string): string {
  if (v === "approved") return c.green(v.toUpperCase());
  if (v === "deferred_to_human") return c.yellow(v.toUpperCase());
  return c.red(v.toUpperCase());
}

async function runOne(id: string, ctx?: Partial<GateContext>) {
  const spec = getPersona(id);
  if (!spec) {
    console.log(c.red(`Unknown persona '${id}'. Try --list.`));
    return;
  }
  const customer = generateCustomer(spec);
  const gateCtx = { nowHour: 11, recentContacts: 0, frequencyCap: 2, ...ctx };
  const { decision, allHypotheses, candidateActions } = await runForCustomer(customer, gateCtx);

  console.log("");
  rule(`${customer.name} · ${customer.age} · ${customer.homeCity} · ${customer.segment} · lang=${customer.preferredLanguage}`);

  // OBSERVE
  console.log(c.cyan("① OBSERVE  ") + c.dim(`${customer.transactions.length} txns · consents: ` +
    customer.consents.map((x) => `${x.purpose.split("_")[0]}=${x.granted ? "✓" : "✗"}`).join(" ")));

  // INFER
  console.log(c.cyan("② INFER    ") + (allHypotheses.length
    ? allHypotheses.map((h) => `${c.bold(h.type)} ${c.dim(`${Math.round(h.confidence * 100)}%`)}`).join("  ")
    : c.dim("no confident signal")));

  const ev = decision.event;
  if (ev.evidence.length) {
    for (const line of ev.evidence) console.log("           " + c.dim("• " + line));
  }

  // DECIDE
  console.log(c.cyan("③ DECIDE   ") + c.bold(`primary: ${ev.type}`) +
    (candidateActions.length ? c.dim("  → ranked actions:") : ""));
  candidateActions.forEach((a, i) => {
    const tag = a.product.highValue ? c.yellow(" [high-value→RM]") : "";
    console.log(`           ${i === 0 ? c.green("▸") : " "} ${a.product.name} ${c.dim(`(score ${a.score})`)}${tag}`);
    if (i === 0) console.log("             " + c.dim(a.rationale));
  });

  // GATE
  console.log(c.cyan("④ GATE     ") + verdictColor(decision.governance.verdict));
  for (const r of decision.governance.reasons) console.log("           " + c.dim("• " + r));
  if (decision.rmHandoffs.length) {
    console.log("           " + c.yellow("↗ escalated to relationship manager: ") +
      c.dim(decision.rmHandoffs.map((a) => a.product.name).join(", ")));
  }

  // ACT
  if (decision.message) {
    const m = decision.message;
    console.log(c.cyan("⑤ ACT      ") + c.mag(`${m.channel} · ${m.language}`));
    console.log("           " + c.bold(m.title));
    for (const line of m.body.split("\n")) console.log("           " + line);
    console.log("           " + c.dim("ⓘ why: " + m.whyThis));
  } else {
    console.log(c.cyan("⑤ ACT      ") + c.dim("no outbound message — " + decision.governance.verdict));
  }
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    console.log(c.bold("\nPersonas:"));
    for (const p of PERSONAS) console.log(`  ${c.green(p.id.padEnd(9))} ${p.name} — scenario: ${c.cyan(p.scenario)}`);
    console.log("");
    return;
  }

  const hourFlag = args.indexOf("--hour");
  const ctx: Partial<GateContext> = {};
  if (hourFlag >= 0) ctx.nowHour = Number(args[hourFlag + 1]);
  const ids = args.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));

  console.log(c.bold(c.mag("\n╔═══ LIFE-EVENT RADAR · agentic engagement demo ═══╗")));
  const targets = ids.length ? ids : PERSONAS.map((p) => p.id);
  for (const id of targets) await runOne(id, ctx);
  rule("end");
}

main();
