import type {
  Customer,
  ConsentRecord,
  LanguageCode,
  LifeEventType,
} from "../domain.ts";

// ---------------------------------------------------------------------------
// Persona specs. Each spec is a compact, human-editable description of a life
// story; the generator (generator.ts) expands it into a realistic ~6-month
// transaction statement. Scripted-but-realistic is exactly right for a demo:
// you control the "aha" moment on stage and touch zero real PII.
// ---------------------------------------------------------------------------

export interface PersonaSpec {
  id: string;
  name: string;
  age: number;
  homeCity: string;
  language: LanguageCode;
  segment: Customer["segment"];
  baselineIncome: number; // monthly salary credit (0 for retiree in the demo)
  baselineRent: number; // monthly rent debit (0 if owns home)
  openingBalance: number;
  /** The scripted life event / behavioural pattern this persona is living through. */
  scenario: LifeEventType | "overspend" | "dormant" | "debt" | "none";
  /** Free-form scenario knobs read by the generator. */
  scenarioParams?: Record<string, string | number>;
  consents: ConsentRecord[];
}

const T0 = "2026-01-01"; // consent grant timestamp for the demo

function fullConsent(): ConsentRecord[] {
  return [
    { purpose: "behavioural_analysis", granted: true, grantedAt: T0 },
    { purpose: "proactive_marketing", granted: true, grantedAt: T0 },
    { purpose: "account_aggregator", granted: true, grantedAt: T0 },
  ];
}

export const PERSONAS: PersonaSpec[] = [
  {
    id: "ravi",
    name: "Ravi Sahu",
    age: 28,
    homeCity: "Bhubaneswar",
    language: "or",
    segment: "mass_affluent",
    baselineIncome: 62000,
    baselineRent: 11000,
    openingBalance: 48000,
    scenario: "relocation",
    // Relocates to Bengaluru in month 4, with a salary hike on the new job.
    scenarioParams: { newCity: "Bengaluru", moveMonthIndex: 3, hikePct: 35 },
    consents: fullConsent(),
  },
  {
    id: "meena",
    name: "Meena Verma",
    age: 41,
    homeCity: "Kanpur",
    language: "hi",
    segment: "mass",
    baselineIncome: 38000,
    baselineRent: 9000,
    openingBalance: 22000,
    scenario: "financial_stress",
    // Income dip + rising credit-card reliance + falling balance.
    scenarioParams: { stressStartMonthIndex: 2 },
    consents: fullConsent(),
  },
  {
    id: "arjun",
    name: "Arjun & Priya Nair",
    age: 31,
    homeCity: "Kochi",
    language: "en",
    segment: "mass_affluent",
    baselineIncome: 90000,
    baselineRent: 0,
    openingBalance: 130000,
    scenario: "marriage",
    scenarioParams: { marriageMonthIndex: 3 },
    consents: fullConsent(),
  },
  {
    id: "lakshmi",
    name: "Lakshmi Iyer",
    age: 34,
    homeCity: "Chennai",
    language: "en",
    segment: "mass_affluent",
    baselineIncome: 75000,
    baselineRent: 16000,
    openingBalance: 90000,
    scenario: "new_baby",
    scenarioParams: { babyMonthIndex: 3 },
    consents: fullConsent(),
  },
  {
    id: "suresh",
    name: "Suresh Rao",
    age: 58,
    homeCity: "Hyderabad",
    language: "en",
    segment: "affluent",
    baselineIncome: 120000,
    baselineRent: 0,
    openingBalance: 640000,
    scenario: "approaching_retirement",
    scenarioParams: { pensionInflowMonthIndex: 4 },
    consents: fullConsent(),
  },
  {
    id: "neha",
    name: "Neha Gupta",
    age: 26,
    homeCity: "Pune",
    language: "hi",
    segment: "mass_affluent",
    baselineIncome: 55000,
    baselineRent: 14000,
    openingBalance: 40000,
    scenario: "salary_hike",
    scenarioParams: { hikeMonthIndex: 3, hikePct: 42 },
    // NOTE: marketing consent withheld — used to demo the consent gate blocking outreach.
    consents: [
      { purpose: "behavioural_analysis", granted: true, grantedAt: T0 },
      { purpose: "proactive_marketing", granted: false, grantedAt: T0 },
      { purpose: "account_aggregator", granted: true, grantedAt: T0 },
    ],
  },
  {
    id: "vikram",
    name: "Vikram Shetty",
    age: 29,
    homeCity: "Mumbai",
    language: "en",
    segment: "mass_affluent",
    baselineIncome: 85000,
    baselineRent: 22000,
    openingBalance: 70000,
    // Income is fine; discretionary spend keeps climbing → Overspend Rescue journey.
    scenario: "overspend",
    consents: fullConsent(),
  },
  {
    id: "rohan",
    name: "Rohan Malhotra",
    age: 36,
    homeCity: "Delhi",
    language: "en",
    segment: "mass_affluent",
    baselineIncome: 95000,
    baselineRent: 0,
    openingBalance: 85000,
    // Healthy income but heavy EMIs (home + car) → Debt-Free Plan journey.
    scenario: "debt",
    consents: fullConsent(),
  },
  {
    id: "gita",
    name: "Gita Devi",
    age: 45,
    homeCity: "Patna",
    language: "hi",
    segment: "mass",
    baselineIncome: 24000,
    baselineRent: 0,
    openingBalance: 12000,
    // Opened an account, used it once, then went silent → Dormant Revival journey.
    scenario: "dormant",
    consents: fullConsent(),
  },
];

export function getPersona(id: string): PersonaSpec | undefined {
  return PERSONAS.find((p) => p.id === id);
}
