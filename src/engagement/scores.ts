import type { Customer, Transaction } from "../domain.ts";
import { DEMO_NOW } from "../data/generator.ts";

// ---------------------------------------------------------------------------
// Engagement intelligence — the metrics SBI Pulse optimises for.
// These are deliberately transparent (rule-based, explainable). In production
// they become trained models; the *shape* of the score stays the same.
// ---------------------------------------------------------------------------

export interface Scores {
  engagement: number; // 0–100  how active/engaged the customer is
  financialHealth: number; // 0–100  how healthy their money looks
  churnRisk: number; // 0–100  likelihood of disengaging/leaving
  dormancyRisk: number; // 0–100  likelihood of going dormant
  savingsRatePct: number; // % of inflow retained
  daysSinceLastTxn: number;
  activeMonths: number; // distinct months with activity (of 6)
  drivers: string[]; // human-readable "why the scores look like this"
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => Math.round(clamp01(n) * 100);

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function computeScores(customer: Customer): Scores {
  const txns = customer.transactions;
  const drivers: string[] = [];

  if (txns.length === 0) {
    return {
      engagement: 0, financialHealth: 50, churnRisk: 90, dormancyRisk: 95,
      savingsRatePct: 0, daysSinceLastTxn: 999, activeMonths: 0,
      drivers: ["No activity on record."],
    };
  }

  const months = new Set(txns.map((t) => t.date.slice(0, 7)));
  const activeMonths = months.size;
  const lastDate = txns.reduce((a, t) => (t.date > a ? t.date : a), txns[0].date);
  const daysSinceLastTxn = daysBetween(lastDate, DEMO_NOW);
  const categories = new Set(txns.map((t) => t.category));

  // ---- Engagement -----------------------------------------------------------
  const recency = clamp01(1 - daysSinceLastTxn / 120);
  const frequency = clamp01(txns.length / 25);
  const monthCoverage = activeMonths / 6;
  const breadth = clamp01(categories.size / 8);
  const engagement = pct(0.35 * recency + 0.3 * frequency + 0.2 * monthCoverage + 0.15 * breadth);

  if (daysSinceLastTxn > 60) drivers.push(`Silent for ${daysSinceLastTxn} days.`);
  if (activeMonths <= 1) drivers.push("Active in only one month of six.");
  if (categories.size >= 6) drivers.push("Uses a broad range of services.");

  // ---- Financial health -----------------------------------------------------
  const credits = txns.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const debits = txns.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
  const savingsRate = credits > 0 ? (credits - debits) / credits : 0;
  const savingsRatePct = Math.round(savingsRate * 100);

  const startBal = txns[0].balanceAfter;
  const endBal = txns[txns.length - 1].balanceAfter;
  const balTrend = startBal > 0 ? clamp01(0.5 + (endBal - startBal) / (2 * startBal)) : 0.5;

  // discretionary (misc) share of spend — high & rising = lifestyle creep
  const discretionary = txns.filter((t) => t.direction === "debit" && t.category === "misc").reduce((s, t) => s + t.amount, 0);
  const discretionaryShare = debits > 0 ? discretionary / debits : 0;

  const stressCats = txns.some((t) => t.category === "emi") &&
    txns.some((t) => t.category === "credit_card_payment" && t.amount < 2000);
  let financialHealth = pct(0.45 * clamp01(savingsRate + 0.3) + 0.35 * balTrend + 0.2 * (1 - discretionaryShare));
  if (stressCats) { financialHealth = Math.max(0, financialHealth - 25); drivers.push("Debt-stress signals (min-payment + EMI)."); }
  if (savingsRate < 0) drivers.push("Spending more than income this period.");
  if (discretionaryShare > 0.35) drivers.push(`Discretionary spend is ${Math.round(discretionaryShare * 100)}% of outflow.`);

  // ---- Risk -----------------------------------------------------------------
  const dormancyRisk = pct(0.6 * (1 - recency) + 0.25 * (1 - frequency) + 0.15 * (1 - monthCoverage));
  const churnRisk = pct(0.5 * (dormancyRisk / 100) + 0.3 * (1 - engagement / 100) + 0.2 * (financialHealth < 40 ? 1 : 0.2));

  return {
    engagement, financialHealth, churnRisk, dormancyRisk,
    savingsRatePct, daysSinceLastTxn, activeMonths,
    drivers,
  };
}

/** Detect a lifestyle-creep / overspend pattern (distinct from distress: income is fine). */
export function detectOverspend(customer: Customer): { detected: boolean; growthPct: number; sharePct: number } {
  const txns = customer.transactions;
  const disc = (mult: (t: Transaction) => boolean) =>
    txns.filter((t) => t.direction === "debit" && t.category === "misc" && mult(t)).reduce((s, t) => s + t.amount, 0);
  const early = disc((t) => t.date < "2026-03");
  const recent = disc((t) => t.date >= "2026-05");
  const growth = early > 0 ? (recent - early) / early : 0;
  const debits = txns.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
  const share = debits > 0 ? disc(() => true) / debits : 0;
  return { detected: growth > 0.8 && share > 0.25, growthPct: Math.round(growth * 100), sharePct: Math.round(share * 100) };
}
