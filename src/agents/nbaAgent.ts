import type { Customer, LifeEventHypothesis, RankedAction } from "../domain.ts";
import { productsForEvent } from "../data/catalog.ts";

// ---------------------------------------------------------------------------
// Next-Best-Action Agent.
// Given the primary life event, selects eligible products and ranks them by a
// transparent score: event confidence × product relevance × indicative value,
// with a human-readable rationale per action.
// ---------------------------------------------------------------------------

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function rankActions(
  customer: Customer,
  event: LifeEventHypothesis,
  limit = 3,
): RankedAction[] {
  const candidates = productsForEvent(event.type, customer);
  if (candidates.length === 0) return [];

  const maxVal = Math.max(...candidates.map((p) => p.indicativeValue), 1);

  const ranked: RankedAction[] = candidates.map((p) => {
    // For "help, not sell" events indicative value is 0, so rank by helpfulness
    // (catalog order) instead of monetary value.
    const valueScore = event.type === "financial_stress" ? 0.5 : p.indicativeValue / maxVal;
    const score = Number((event.confidence * (0.5 + 0.5 * valueScore)).toFixed(3));
    return { product: p, score, rationale: rationaleFor(p, event) };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

function rationaleFor(
  p: { name: string; highValue?: boolean; indicativeValue: number },
  event: LifeEventHypothesis,
): string {
  switch (event.type) {
    case "salary_hike":
      return `Higher surplus (+${event.facts.deltaPct}%) can be routed into ${p.name} before lifestyle creep absorbs it.`;
    case "relocation":
      return `New-city setup in ${event.facts.toCity} makes ${p.name} timely and useful.`;
    case "marriage":
      return `Newly-weds typically consolidate finances and add protection — ${p.name} fits.`;
    case "new_baby":
      return `A new child raises protection + long-term goals; ${p.name} addresses that.`;
    case "approaching_retirement":
      return `Nearing retirement, capital safety and income matter — ${p.name} supports that.`;
    case "child_college":
      return `A large education outlay is approaching; ${p.name} helps fund it.`;
    case "financial_stress":
      return `Signs of strain detected — ${p.name} offers relief, not another liability.`;
    default:
      return `${p.name} is relevant to the detected event.`;
  }
}
