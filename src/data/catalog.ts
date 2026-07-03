import type { Customer, Product } from "../domain.ts";

// ---------------------------------------------------------------------------
// SBI product catalog (illustrative). Each product declares the life events it
// serves, an eligibility predicate, and an indicative value used only for
// ranking + ROI illustration on stage.
// ---------------------------------------------------------------------------

export const CATALOG: Product[] = [
  {
    id: "sip_stepup",
    name: "Step-up SIP (SBI Mutual Fund)",
    category: "investment",
    relevantEvents: ["salary_hike", "new_baby", "child_college"],
    eligible: (c) => c.age >= 18 && c.age <= 60,
    indicativeValue: 6000,
  },
  {
    id: "sweep_fd",
    name: "Multi-Option Deposit (sweep-in FD)",
    category: "deposit",
    relevantEvents: ["salary_hike"],
    eligible: (c) => c.age >= 18,
    indicativeValue: 2500,
  },
  {
    id: "elss_tax",
    name: "ELSS Tax-Saver Fund",
    category: "investment",
    relevantEvents: ["salary_hike"],
    eligible: (c) => c.age >= 21 && c.age <= 58,
    indicativeValue: 4500,
  },
  {
    id: "rent_autopay",
    name: "Rent Auto-Pay + UPI Mandate",
    category: "service",
    relevantEvents: ["relocation"],
    eligible: () => true,
    indicativeValue: 300,
  },
  {
    id: "pl_preapproved",
    name: "Pre-approved Personal Loan",
    category: "lending",
    relevantEvents: ["relocation", "marriage"],
    eligible: (c) => c.age >= 21 && c.age <= 58 && c.segment !== "mass",
    indicativeValue: 12000,
    highValue: true,
  },
  {
    id: "joint_account",
    name: "Joint Savings Account",
    category: "service",
    relevantEvents: ["marriage"],
    eligible: () => true,
    indicativeValue: 500,
  },
  {
    id: "term_insurance",
    name: "SBI Life Term Insurance",
    category: "insurance",
    relevantEvents: ["marriage", "new_baby"],
    eligible: (c) => c.age >= 18 && c.age <= 55,
    indicativeValue: 9000,
    highValue: true,
  },
  {
    id: "health_topup",
    name: "Health Cover Top-up",
    category: "insurance",
    relevantEvents: ["new_baby", "marriage"],
    eligible: (c) => c.age >= 18 && c.age <= 60,
    indicativeValue: 5000,
  },
  {
    id: "child_edu_rd",
    name: "Child Education Goal RD",
    category: "deposit",
    relevantEvents: ["new_baby", "child_college"],
    eligible: () => true,
    indicativeValue: 3000,
  },
  {
    id: "education_loan",
    name: "Pre-approved Education Loan",
    category: "lending",
    relevantEvents: ["child_college"],
    eligible: (c) => c.age >= 38,
    indicativeValue: 20000,
    highValue: true,
  },
  {
    id: "scss",
    name: "Senior Citizens' Savings Scheme (SCSS)",
    category: "deposit",
    relevantEvents: ["approaching_retirement"],
    eligible: (c) => c.age >= 55,
    indicativeValue: 8000,
  },
  {
    id: "annuity",
    name: "SBI Life Annuity / Pension Plan",
    category: "insurance",
    relevantEvents: ["approaching_retirement"],
    eligible: (c) => c.age >= 50,
    indicativeValue: 15000,
    highValue: true,
  },
  // --- "help, not sell" options used for the financial-stress case ---
  {
    id: "restructure",
    name: "EMI Restructuring / Moratorium Assist",
    category: "service",
    relevantEvents: ["financial_stress"],
    eligible: () => true,
    indicativeValue: 0,
  },
  {
    id: "budget_coach",
    name: "YONO Budgeting & Cashflow Coach",
    category: "service",
    relevantEvents: ["financial_stress"],
    eligible: () => true,
    indicativeValue: 0,
  },
];

export function productsForEvent(
  eventType: string,
  customer: Customer,
): Product[] {
  return CATALOG.filter(
    (p) => p.relevantEvents.includes(eventType as never) && p.eligible(customer),
  );
}
