import { PERSONAS, getPersona, type PersonaSpec } from "../data/personas.ts";
import { generateCustomer } from "../data/generator.ts";
import { runForCustomer } from "../orchestrator.ts";
import { CATALOG } from "../data/catalog.ts";
import type { Customer } from "../domain.ts";

// ---------------------------------------------------------------------------
// Serializable API over the engine. Produces plain JSON payloads the browser
// UI can render + animate. No framework, no state — every call re-runs the loop.
// ---------------------------------------------------------------------------

export interface RunOpts {
  hour?: number;
  recentContacts?: number;
  frequencyCap?: number;
  /** Live override of proactive-marketing consent (to demo the gate on stage). */
  marketing?: boolean;
}

const valueOf = (productId: string) =>
  CATALOG.find((p) => p.id === productId)?.indicativeValue ?? 0;

function applyOverrides(customer: Customer, opts: RunOpts): Customer {
  if (opts.marketing === undefined) return customer;
  return {
    ...customer,
    consents: customer.consents.map((c) =>
      c.purpose === "proactive_marketing" ? { ...c, granted: opts.marketing! } : c,
    ),
  };
}

function specSummary(p: PersonaSpec) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    homeCity: p.homeCity,
    language: p.language,
    segment: p.segment,
    scenario: p.scenario,
  };
}

export function listPersonas() {
  return PERSONAS.map(specSummary);
}

export async function runPersona(id: string, opts: RunOpts = {}) {
  const spec = getPersona(id);
  if (!spec) return null;
  const customer = applyOverrides(generateCustomer(spec), opts);
  const ctx = {
    nowHour: opts.hour ?? 11,
    recentContacts: opts.recentContacts ?? 0,
    frequencyCap: opts.frequencyCap ?? 2,
  };
  const { decision, ledger, allHypotheses, candidateActions } = await runForCustomer(customer, ctx);

  const mapAction = (a: (typeof candidateActions)[number]) => ({
    id: a.product.id,
    name: a.product.name,
    category: a.product.category,
    score: a.score,
    rationale: a.rationale,
    highValue: !!a.product.highValue,
    value: a.product.indicativeValue,
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      age: customer.age,
      homeCity: customer.homeCity,
      language: customer.preferredLanguage,
      segment: customer.segment,
      scenario: spec.scenario,
      consents: customer.consents.map((c) => ({ purpose: c.purpose, granted: c.granted })),
      transactions: customer.transactions,
    },
    hypotheses: allHypotheses,
    primary: decision.event.confidence > 0 ? decision.event : null,
    actions: candidateActions.map(mapAction),
    proactive: decision.action ? mapAction(decision.action) : null,
    rmHandoffs: decision.rmHandoffs.map(mapAction),
    governance: decision.governance,
    message: decision.message ?? null,
    ledger: ledger.forCustomer(customer.id),
    context: ctx,
  };
}

export type RunPayload = NonNullable<Awaited<ReturnType<typeof runPersona>>>;

export async function runFleet(opts: RunOpts = {}) {
  const rows = [] as Array<{
    id: string;
    name: string;
    segment: string;
    language: string;
    event: string | null;
    confidence: number;
    verdict: string;
    channel: string | null;
    proactive: string | null;
    rmCount: number;
    projectedValue: number;
  }>;

  let eventsDetected = 0;
  let proactiveSends = 0;
  let suppressed = 0;
  let careInterventions = 0;
  let rmHandoffs = 0;
  let projectedValue = 0;

  for (const p of PERSONAS) {
    const r = await runPersona(p.id, opts);
    if (!r) continue;
    const v = r.governance.verdict;
    if (r.primary) eventsDetected += 1;
    if (r.message) proactiveSends += 1;
    if (v === "suppressed") suppressed += 1;
    if (r.primary?.type === "financial_stress") careInterventions += 1;
    rmHandoffs += r.rmHandoffs.length;

    const rowValue =
      (r.message && r.proactive ? valueOf(r.proactive.id) : 0) +
      r.rmHandoffs.reduce((s, a) => s + valueOf(a.id), 0);
    projectedValue += rowValue;

    rows.push({
      id: r.customer.id,
      name: r.customer.name,
      segment: r.customer.segment,
      language: r.customer.language,
      event: r.primary?.type ?? null,
      confidence: r.primary?.confidence ?? 0,
      verdict: v,
      channel: r.message?.channel ?? null,
      proactive: r.proactive?.name ?? null,
      rmCount: r.rmHandoffs.length,
      projectedValue: rowValue,
    });
  }

  return {
    rows,
    metrics: {
      customers: PERSONAS.length,
      eventsDetected,
      proactiveSends,
      careInterventions,
      suppressed,
      rmHandoffs,
      projectedValuePerCustomer: projectedValue,
    },
  };
}
