import type { LedgerEntry } from "../domain.ts";
import { DEMO_NOW } from "../data/generator.ts";

// ---------------------------------------------------------------------------
// Explainability Ledger.
// Every stage of every decision is appended here with a human-readable summary.
// This is the audit trail that answers "why did the bank contact this customer,
// with what data, and on what basis?" — the DPDP/RBI transparency requirement.
// In-memory for the demo; a durable append-only store in production.
// ---------------------------------------------------------------------------

export class Ledger {
  private entries: LedgerEntry[] = [];
  private seq = 0;

  record(
    customerId: string,
    stage: LedgerEntry["stage"],
    summary: string,
    detail: Record<string, unknown> = {},
  ): void {
    // Deterministic pseudo-timestamp for reproducible demos.
    this.seq += 1;
    const ts = `${DEMO_NOW}T${String(9 + Math.floor(this.seq / 6)).padStart(2, "0")}:${String((this.seq * 7) % 60).padStart(2, "0")}:00`;
    this.entries.push({ timestamp: ts, customerId, stage, summary, detail });
  }

  forCustomer(customerId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.customerId === customerId);
  }

  all(): LedgerEntry[] {
    return [...this.entries];
  }
}
