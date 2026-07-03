import type { Customer, Transaction, Category, Direction } from "../domain.ts";
import type { PersonaSpec } from "./personas.ts";

// ---------------------------------------------------------------------------
// Deterministic synthetic statement generator.
// Expands a PersonaSpec into ~6 months of realistic transactions. Seeded so
// every run is identical (reliable on stage). No real data, ever.
// ---------------------------------------------------------------------------

const MONTHS = 6; // 2026-01 .. 2026-06 ; "now" = 2026-07-01
export const DEMO_NOW = "2026-07-01";

/** Tiny seeded PRNG (mulberry32) for organic-but-reproducible amounts. */
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function dateOf(monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `2026-${mm}-${dd}`;
}

export function generateCustomer(spec: PersonaSpec): Customer {
  const rand = rng(seedFromId(spec.id));
  const jitter = (base: number, pct = 0.06) =>
    Math.round(base * (1 + (rand() - 0.5) * 2 * pct));

  const txns: Transaction[] = [];
  let balance = spec.openingBalance;
  let city = spec.homeCity;
  let income = spec.baselineIncome;
  let rent = spec.baselineRent;

  const p = spec.scenarioParams ?? {};
  const num = (k: string, d = -1) => (typeof p[k] === "number" ? (p[k] as number) : d);

  const push = (
    monthIndex: number,
    day: number,
    direction: Direction,
    amount: number,
    category: Category,
    merchant: string,
    narration: string,
    txnCity = city,
  ) => {
    balance += direction === "credit" ? amount : -amount;
    txns.push({
      date: dateOf(monthIndex, day),
      direction,
      amount,
      category,
      merchant,
      narration,
      city: txnCity,
      balanceAfter: Math.round(balance),
    });
  };

  for (let m = 0; m < MONTHS; m++) {
    // --- scenario mutations that take effect at the start of a month ---
    if (spec.scenario === "relocation" && m === num("moveMonthIndex")) {
      city = String(p.newCity ?? city);
      income = Math.round(spec.baselineIncome * (1 + num("hikePct", 0) / 100));
      rent = Math.round(spec.baselineRent * 1.7); // new metro rent
      // one-off security deposit for the new flat
      push(m, 2, "debit", rent * 2, "rent", `${city} Housing Deposit`, "Rent security deposit", city);
    }
    if (spec.scenario === "salary_hike" && m === num("hikeMonthIndex")) {
      income = Math.round(spec.baselineIncome * (1 + num("hikePct", 0) / 100));
    }
    const inStress =
      spec.scenario === "financial_stress" && m >= num("stressStartMonthIndex");
    if (inStress) {
      // income dips ~30% (reduced overtime / gig slump)
      income = Math.round(spec.baselineIncome * 0.7);
    }

    // --- dormant customer: almost no activity, big gaps ------------------
    if (spec.scenario === "dormant") {
      if (m === 0) {
        push(m, 3, "credit", jitter(spec.baselineIncome, 0.1), "salary", "Employer Payroll", "Salary credit");
        push(m, 6, "debit", jitter(2500, 0.2), "groceries", "Local Kirana", "Groceries");
      }
      // months 1..5: silence (the disengagement we want to revive)
      continue;
    }

    // --- recurring monthly flows ---
    if (income > 0) {
      const employer =
        spec.scenario === "relocation" && m >= num("moveMonthIndex")
          ? "TechNova Pvt Ltd"
          : "Employer Payroll";
      push(m, 1, "credit", jitter(income), "salary", employer, `Salary credit - ${employer}`);
    }
    if (rent > 0) {
      push(m, 5, "debit", rent, "rent", `${city} Landlord`, "Monthly house rent", city);
    }
    // groceries (2 hits) + utilities
    push(m, 8, "debit", jitter(4200, 0.15), "groceries", "More Supermarket", "Groceries");
    push(m, 20, "debit", jitter(3100, 0.2), "groceries", "Local Kirana", "Groceries");
    push(m, 10, "debit", jitter(1800, 0.1), "utilities", "Electricity Board", "Electricity bill");

    // tight persona: modest income, outflows slightly exceed it → slow grind down
    if (spec.scenario === "tight") {
      push(m, 11, "debit", jitter(5200, 0.12), "emi", "Bike Loan EMI", "Two-wheeler EMI");
      push(m, 24, "debit", jitter(3600, 0.18), "misc", "Family Support Transfer", "Transfer home");
    }

    // debt persona: healthy income, but two large recurring EMIs
    if (spec.scenario === "debt") {
      push(m, 7, "debit", jitter(24000, 0.02), "emi", "SBI Home Loan", "Home loan EMI");
      push(m, 9, "debit", jitter(9500, 0.02), "emi", "SBI Car Loan", "Car loan EMI");
    }

    // credit-card payment: healthy customers pay in full-ish; stress => minimum
    const ccFull = jitter(9000, 0.25);
    if (inStress) {
      push(m, 15, "debit", Math.round(ccFull * 0.05), "credit_card_payment", "SBI Card", "Minimum amount due");
      // extra EMI burden appearing under stress
      push(m, 18, "debit", jitter(7500, 0.05), "emi", "Consumer Durable EMI", "EMI - white goods");
    } else {
      push(m, 15, "debit", ccFull, "credit_card_payment", "SBI Card", "Credit card bill payment");
    }

    // --- scenario one-offs within the month ---
    if (spec.scenario === "marriage" && m === num("marriageMonthIndex")) {
      push(m, 12, "debit", jitter(180000, 0.1), "jewellery", "Kalyan Jewellers", "Gold & jewellery purchase");
      push(m, 14, "debit", jitter(140000, 0.1), "venue_events", "Grand Regency Banquets", "Wedding venue & catering");
    }
    if (spec.scenario === "new_baby") {
      if (m === num("babyMonthIndex")) {
        push(m, 11, "debit", jitter(85000, 0.1), "hospital", "Apollo Cradle", "Maternity & delivery");
      }
      if (m > num("babyMonthIndex")) {
        push(m, 9, "debit", jitter(3500, 0.2), "baby_care", "FirstCry", "Baby care & essentials");
      }
    }
    if (spec.scenario === "relocation" && m >= num("moveMonthIndex")) {
      // new-city merchant cluster
      push(m, 22, "debit", jitter(2600, 0.25), "misc", "Bengaluru Metro / Ola", "New-city commute", city);
    }
    if (spec.scenario === "approaching_retirement" && m >= num("pensionInflowMonthIndex")) {
      push(m, 25, "credit", jitter(9000, 0.05), "pension", "NPS / EPFO", "Pension / PF inflow");
    }
    if (inStress) {
      // draining savings to cover the gap
      push(m, 28, "debit", jitter(6000, 0.2), "misc", "ATM Withdrawal", "Cash withdrawal");
    }
    if (spec.scenario === "overspend") {
      // discretionary spend that grows month over month (income stays fine —
      // this is a lifestyle-creep pattern, NOT financial distress).
      const ramp = 1 + m * 0.35;
      const discretionary = [
        ["Amazon", 5200], ["Swiggy / Zomato", 3800], ["Myntra", 4600], ["BookMyShow", 1500],
      ];
      discretionary.forEach(([mch, base], k) =>
        push(m, 16 + k, "debit", jitter(Math.round(base * ramp), 0.2), "misc", mch, "Online / lifestyle spend"),
      );
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    age: spec.age,
    homeCity: spec.homeCity,
    preferredLanguage: spec.language,
    segment: spec.segment,
    transactions: txns,
    consents: spec.consents,
    contactWindow: { startHour: 9, endHour: 21 }, // TRAI 9am–9pm default
  };
}
