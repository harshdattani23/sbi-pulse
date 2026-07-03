// ---------------------------------------------------------------------------
// Domain types for Life-Event Radar.
// A small, explicit vocabulary shared by every agent and the governance layer.
// ---------------------------------------------------------------------------

/** Transaction categories we tag synthetic data with, so signal detection is clean. */
export type Category =
  | "salary"
  | "pension"
  | "rent"
  | "emi"
  | "credit_card_payment"
  | "groceries"
  | "utilities"
  | "jewellery"
  | "venue_events"
  | "hospital"
  | "baby_care"
  | "education"
  | "investment"
  | "misc";

export type Direction = "credit" | "debit";

export interface Transaction {
  date: string; // ISO yyyy-mm-dd
  direction: Direction;
  amount: number; // always positive; sign implied by direction
  category: Category;
  merchant: string;
  narration: string;
  city: string;
  balanceAfter: number;
}

/** A synthetic customer + the raw material the agent observes. */
export interface Customer {
  id: string;
  name: string;
  age: number;
  homeCity: string;
  preferredLanguage: LanguageCode;
  segment: "mass" | "mass_affluent" | "affluent";
  transactions: Transaction[];
  consents: ConsentRecord[];
  /** DND / quiet-hours preference honoured by the governance gate. */
  contactWindow?: { startHour: number; endHour: number };
}

export type LanguageCode = "en" | "hi" | "or"; // English, Hindi, Odia (demo set)

/** DPDP-style purpose-scoped, revocable consent. */
export interface ConsentRecord {
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
}

export type ConsentPurpose =
  | "behavioural_analysis" // may we infer life events from your data?
  | "proactive_marketing" // may we proactively contact you with offers?
  | "account_aggregator"; // may we enrich via consented AA pulls?

// ---- Life events ----------------------------------------------------------

export type LifeEventType =
  | "salary_hike"
  | "relocation"
  | "marriage"
  | "new_baby"
  | "child_college"
  | "approaching_retirement"
  | "financial_stress";

export interface LifeEventHypothesis {
  type: LifeEventType;
  confidence: number; // 0..1
  /** Human-readable evidence lines — feed the explainability ledger. */
  evidence: string[];
  /** Structured facts downstream agents can use (e.g. new city, delta income). */
  facts: Record<string, string | number>;
}

// ---- Actions / next-best-action ------------------------------------------

export interface Product {
  id: string;
  name: string;
  category: "investment" | "insurance" | "lending" | "deposit" | "service";
  /** Life events this product is relevant to. */
  relevantEvents: LifeEventType[];
  /** Simple eligibility predicate over the customer. */
  eligible: (c: Customer) => boolean;
  /** Rough per-customer annual value, used only to rank + illustrate ROI. */
  indicativeValue: number;
  /** Whether this is a high-value action requiring human-in-the-loop. */
  highValue?: boolean;
}

export interface RankedAction {
  product: Product;
  score: number;
  rationale: string;
}

// ---- Decisions + governance ----------------------------------------------

export type GateVerdict = "approved" | "suppressed" | "deferred_to_human";

export interface GovernanceResult {
  verdict: GateVerdict;
  reasons: string[]; // why approved / suppressed
  channel?: Channel;
}

export type Channel = "yono_card" | "whatsapp" | "voice";

export interface Message {
  language: LanguageCode;
  channel: Channel;
  title: string;
  body: string;
  whyThis: string; // "Why am I seeing this?" transparency string
}

export interface Decision {
  customerId: string;
  event: LifeEventHypothesis;
  /** The light-touch action taken proactively (if any). */
  action?: RankedAction;
  governance: GovernanceResult;
  message?: Message;
  /** High-value actions escalated to a relationship manager instead of auto-sent. */
  rmHandoffs: RankedAction[];
  timestamp: string;
}

// ---- Explainability ledger -----------------------------------------------

export interface LedgerEntry {
  timestamp: string;
  customerId: string;
  stage: "observe" | "infer" | "decide" | "gate" | "act" | "learn";
  summary: string;
  detail: Record<string, unknown>;
}
