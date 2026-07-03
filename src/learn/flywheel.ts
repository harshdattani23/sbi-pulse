import { ThompsonBandit } from "./bandit.ts";

// ---------------------------------------------------------------------------
// The outcome feedback flywheel — SBI Pulse's actual moat.
// A Thompson-sampling bandit learns, per (journey × customer segment), which
// message TONE drives the best response — purely from outcomes. The live app
// feeds the same policy (see pulseApi), so real usage trains it. Here we also
// simulate a stream of interactions to show it converge and beat a naive policy.
//
// Honest framing: the *mechanism* (online bandit learning from rewards) is real
// and is what the live product uses. The latent "true" tone-affinities below are
// synthetic ground truth used only to generate rewards for the simulation.
// ---------------------------------------------------------------------------

export const VARIANTS = [
  { id: "warm", label: "Warm & personal", hint: "gentle, empathetic, first-name, zero pressure" },
  { id: "direct", label: "Clear & direct", hint: "concise, benefit-first, action-oriented" },
  { id: "social", label: "Social proof", hint: "note that many similar customers benefited" },
  { id: "goal", label: "Goal-framed", hint: "frame around their future goal / outcome" },
] as const;

export type Segment = "mass" | "mass_affluent" | "affluent";
const SEGMENTS: Segment[] = ["mass", "mass_affluent", "affluent"];
const JOURNEYS = ["first_sip", "overspend_rescue", "dormant_revival", "stress_shield", "new_baby_nest"];

// hidden ground truth: which tone each segment responds to best
const SEG_BEST: Record<Segment, string> = { mass: "warm", mass_affluent: "social", affluent: "goal" };
const JOURNEY_BASE: Record<string, number> = {
  first_sip: 0.28, overspend_rescue: 0.22, dormant_revival: 0.18, stress_shield: 0.34, new_baby_nest: 0.30,
};

function latentRate(seg: Segment, journey: string, variant: string): number {
  const base = JOURNEY_BASE[journey] ?? 0.25;
  const mult = variant === SEG_BEST[seg] ? 1.6 : variant === "warm" ? 1.05 : 0.75;
  return Math.max(0.03, Math.min(0.9, base * mult));
}

const armKey = (journey: string, seg: string, variant: string) => `${journey}::${seg}::${variant}`;

// ---- persistent learner state (lives for the server process) --------------
const bandit = new ThompsonBandit(20260702);
let envRand = mulberry(99991);
let n = 0;
let banditHits = 0, randomHits = 0, oracleHits = 0;
const history: Array<{ i: number; bandit: number; random: number; oracle: number }> = [];
const SAMPLE_EVERY = 25;

function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(arr: T[]) => arr[Math.floor(envRand() * arr.length)];

/** Run `rounds` simulated interactions through the live policy; updates state. */
export function train(rounds: number): void {
  for (let r = 0; r < rounds; r++) {
    const seg = pick(SEGMENTS);
    const journey = pick(JOURNEYS);
    const keys = VARIANTS.map((v) => armKey(journey, seg, v.id));

    const chosen = bandit.select(keys);
    const variant = chosen.split("::")[2];
    const reward: 0 | 1 = envRand() < latentRate(seg, journey, variant) ? 1 : 0;
    bandit.update(chosen, reward);
    banditHits += reward;

    // baselines for comparison (do not update the policy)
    const rv = pick(VARIANTS as unknown as typeof VARIANTS[number][]).id;
    randomHits += envRand() < latentRate(seg, journey, rv) ? 1 : 0;
    oracleHits += envRand() < latentRate(seg, journey, SEG_BEST[seg]) ? 1 : 0;

    n += 1;
    if (n % SAMPLE_EVERY === 0) history.push({ i: n, bandit: banditHits / n, random: randomHits / n, oracle: oracleHits / n });
  }
}

// warm start so the first view already shows an early (not-yet-converged) curve
train(200);

function downsample<T>(arr: T[], max = 70): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.floor(i * step)]);
}

export function flywheelState() {
  const window = 400;
  const recent = history.slice(-Math.ceil(window / SAMPLE_EVERY));
  const cur = history[history.length - 1] ?? { bandit: 0, random: 0, oracle: 1 };
  const bAcc = cur.bandit, rAcc = cur.random, oAcc = cur.oracle;

  const bestTones = JOURNEYS.map((j) => {
    const seg: Segment = "mass_affluent";
    const keys = VARIANTS.map((v) => armKey(j, seg, v.id));
    const bestKey = bandit.best(keys);
    const variant = bestKey.split("::")[2];
    const st = bandit.stat(bestKey);
    const meta = VARIANTS.find((v) => v.id === variant)!;
    const learnedRight = variant === SEG_BEST[seg];
    return { journey: j, tone: meta.label, toneId: variant, mean: Math.round(st.mean * 100), pulls: st.pulls, learnedRight };
  });

  return {
    interactions: n,
    curve: downsample(history).map((h) => ({ i: h.i, bandit: Math.round(h.bandit * 1000) / 10, random: Math.round(h.random * 1000) / 10, oracle: Math.round(h.oracle * 1000) / 10 })),
    current: {
      bandit: Math.round(bAcc * 1000) / 10,
      random: Math.round(rAcc * 1000) / 10,
      oracle: Math.round(oAcc * 1000) / 10,
      upliftPp: Math.round((bAcc - rAcc) * 1000) / 10,
      pctOfCeiling: oAcc > 0 ? Math.round((bAcc / oAcc) * 100) : 0,
    },
    bestTones,
  };
}

/** Live product: current best-known tone for a segment (aggregated across journeys,
 *  including the live "agentic" arms fed by real agent outcomes). */
export function bestToneForSegment(segment: string): { id: string; label: string; hint: string } {
  const seg = (SEGMENTS as string[]).includes(segment) ? (segment as Segment) : "mass_affluent";
  const totals = VARIANTS.map((v) => {
    let sum = 0;
    for (const j of [...JOURNEYS, "agentic"]) sum += bandit.stat(armKey(j, seg, v.id)).mean;
    return { v, sum };
  });
  totals.sort((a, b) => b.sum - a.sum);
  return { id: totals[0].v.id, label: totals[0].v.label, hint: totals[0].v.hint };
}

/** Live product: fold a real journey outcome back into the policy. */
export function recordOutcome(journey: string, segment: string, variant: string, reward: 0 | 1): void {
  const seg = (SEGMENTS as string[]).includes(segment) ? segment : "mass_affluent";
  bandit.update(armKey(journey, seg, variant), reward);
  n += 1; banditHits += reward;
  if (n % SAMPLE_EVERY === 0) history.push({ i: n, bandit: banditHits / n, random: randomHits / n, oracle: oracleHits / n });
}
