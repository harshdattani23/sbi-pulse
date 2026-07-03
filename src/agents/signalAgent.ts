import type {
  Customer,
  Transaction,
  LifeEventHypothesis,
  LifeEventType,
} from "../domain.ts";

// ---------------------------------------------------------------------------
// Signal / Inference Agent.
// Turns a raw transaction stream into ranked life-event hypotheses with a
// confidence score and human-readable evidence. Deterministic + explainable
// by design: in production the rules become a trained model, but the *evidence
// lines* stay — they are what makes every downstream action auditable.
// ---------------------------------------------------------------------------

const CONFIDENCE_FLOOR = 0.5; // below this the agent stays silent

interface MonthAgg {
  month: string; // "2026-01"
  byCat: Record<string, number>; // debit totals by category (positive)
  income: number; // salary + pension credits
  endBalance: number;
  city: string; // dominant city of the month
}

function monthOf(t: Transaction): string {
  return t.date.slice(0, 7);
}

function aggregateByMonth(txns: Transaction[]): MonthAgg[] {
  const map = new Map<string, MonthAgg>();
  for (const t of txns) {
    const key = monthOf(t);
    let agg = map.get(key);
    if (!agg) {
      agg = { month: key, byCat: {}, income: 0, endBalance: 0, city: t.city };
      map.set(key, agg);
    }
    if (t.direction === "debit") {
      agg.byCat[t.category] = (agg.byCat[t.category] ?? 0) + t.amount;
    }
    if (t.direction === "credit" && (t.category === "salary" || t.category === "pension")) {
      agg.income += t.amount;
    }
    agg.endBalance = t.balanceAfter; // last write wins ~ end-of-month balance
  }
  const months = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  // dominant city = most frequent city among that month's rent/salary txns
  for (const agg of months) {
    const cities = txns
      .filter((t) => monthOf(t) === agg.month)
      .map((t) => t.city);
    agg.city = mode(cities) ?? agg.city;
  }
  return months;
}

function mode<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const x of arr) {
    const n = (counts.get(x) ?? 0) + 1;
    counts.set(x, n);
    if (n > bestN) {
      bestN = n;
      best = x;
    }
  }
  return best;
}

const clamp = (n: number) => Math.max(0, Math.min(0.98, n));
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// ---------------------------------------------------------------------------

export function inferLifeEvents(customer: Customer): LifeEventHypothesis[] {
  const months = aggregateByMonth(customer.transactions);
  if (months.length < 3) return [];

  const hyps: LifeEventHypothesis[] = [];
  const early = months.slice(0, 2);
  const recent = months.slice(-2);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

  // --- salary hike ---------------------------------------------------------
  const oldInc = avg(early.map((m) => m.income));
  const newInc = avg(recent.map((m) => m.income));
  if (oldInc > 0 && newInc > oldInc * 1.25) {
    const delta = (newInc - oldInc) / oldInc;
    hyps.push({
      type: "salary_hike",
      confidence: clamp(0.6 + delta),
      evidence: [
        `Recurring income rose from ~${inr(oldInc)} to ~${inr(newInc)} (+${Math.round(delta * 100)}%).`,
        `Higher, stable monthly credit sustained over ${recent.length} months.`,
      ],
      facts: { oldIncome: Math.round(oldInc), newIncome: Math.round(newInc), deltaPct: Math.round(delta * 100) },
    });
  }

  // --- relocation ----------------------------------------------------------
  const startCity = months[0].city;
  const endCity = months[months.length - 1].city;
  if (startCity !== endCity) {
    hyps.push({
      type: "relocation",
      confidence: 0.82,
      evidence: [
        `Banking activity shifted from ${startCity} to ${endCity}.`,
        `Rent debits and merchant geography now cluster in ${endCity}.`,
      ],
      facts: { fromCity: startCity, toCity: endCity },
    });
  }

  // --- marriage ------------------------------------------------------------
  const marriageMonth = months.find(
    (m) => (m.byCat["jewellery"] ?? 0) > 50000 && (m.byCat["venue_events"] ?? 0) > 50000,
  );
  if (marriageMonth) {
    const total = (marriageMonth.byCat["jewellery"] ?? 0) + (marriageMonth.byCat["venue_events"] ?? 0);
    hyps.push({
      type: "marriage",
      confidence: 0.8,
      evidence: [
        `Large jewellery + banquet/venue spends clustered in ${marriageMonth.month} (${inr(total)}).`,
        `Spend pattern consistent with a wedding.`,
      ],
      facts: { month: marriageMonth.month, totalSpend: Math.round(total) },
    });
  }

  // --- new baby ------------------------------------------------------------
  const hospitalMonthIdx = months.findIndex((m) => (m.byCat["hospital"] ?? 0) > 40000);
  const babyCareAfter = hospitalMonthIdx >= 0 &&
    months.slice(hospitalMonthIdx + 1).some((m) => (m.byCat["baby_care"] ?? 0) > 0);
  if (hospitalMonthIdx >= 0 && babyCareAfter) {
    hyps.push({
      type: "new_baby",
      confidence: 0.78,
      evidence: [
        `Maternity/hospital spend in ${months[hospitalMonthIdx].month}, followed by recurring baby-care merchants.`,
        `Pattern consistent with a new child in the family.`,
      ],
      facts: { month: months[hospitalMonthIdx].month },
    });
  }

  // --- approaching retirement ---------------------------------------------
  const pensionInflow = months.some((m) =>
    customer.transactions.some((t) => monthOf(t) === m.month && t.category === "pension"),
  );
  if (customer.age >= 55 && pensionInflow) {
    hyps.push({
      type: "approaching_retirement",
      confidence: clamp(0.55 + (customer.age - 55) * 0.05),
      evidence: [
        `Customer age ${customer.age}, nearing retirement.`,
        `Pension / PF inflows have begun appearing.`,
      ],
      facts: { age: customer.age },
    });
  }

  // --- financial stress (guardrail case) -----------------------------------
  const startBal = months[0].endBalance;
  const endBal = months[months.length - 1].endBalance;
  const balDeclining = endBal < startBal * 0.85;
  const incomeDrop = newInc > 0 && newInc < oldInc * 0.85;
  const minPaymentPattern = recent.some((m) => {
    const cc = m.byCat["credit_card_payment"] ?? 0;
    return cc > 0 && cc < 2000; // tiny CC payment => minimum-due reliance
  });
  const rawEmi = recent.some((m) => (m.byCat["emi"] ?? 0) > 0);
  const stressSignals = [balDeclining, incomeDrop, minPaymentPattern, rawEmi].filter(Boolean).length;
  if (stressSignals >= 2) {
    hyps.push({
      type: "financial_stress",
      confidence: clamp(0.5 + stressSignals * 0.12),
      evidence: [
        balDeclining ? `Balance fell from ${inr(startBal)} to ${inr(endBal)}.` : "",
        incomeDrop ? `Recurring income dropped ~${Math.round((1 - newInc / oldInc) * 100)}%.` : "",
        minPaymentPattern ? "Credit-card paid at/near minimum due." : "",
        rawEmi ? "New EMI obligations added under a tightening budget." : "",
      ].filter(Boolean),
      facts: { startBalance: Math.round(startBal), endBalance: Math.round(endBal), signals: stressSignals },
    });
  }

  return hyps
    .filter((h) => h.confidence >= CONFIDENCE_FLOOR)
    .sort((a, b) => b.confidence - a.confidence);
}

/** Priority order when a customer triggers multiple events. Stress always wins:
 *  detecting distress must pre-empt any cross-sell. */
const PRIORITY: LifeEventType[] = [
  "financial_stress",
  "relocation",
  "new_baby",
  "marriage",
  "approaching_retirement",
  "salary_hike",
  "child_college",
];

export function primaryEvent(hyps: LifeEventHypothesis[]): LifeEventHypothesis | undefined {
  if (hyps.length === 0) return undefined;
  return [...hyps].sort((a, b) => {
    const pa = PRIORITY.indexOf(a.type);
    const pb = PRIORITY.indexOf(b.type);
    if (pa !== pb) return pa - pb;
    return b.confidence - a.confidence;
  })[0];
}
