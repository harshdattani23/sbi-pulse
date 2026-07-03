// ---------------------------------------------------------------------------
// Thompson-sampling contextual bandit (Beta-Bernoulli).
// This is a real online-learning policy — the same class of algorithm
// production engagement systems use to learn what works from outcomes.
// Seeded for reproducibility on stage.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Arm { a: number; b: number } // Beta(a, b) posterior; a-1 successes, b-1 failures

export class ThompsonBandit {
  private rand: () => number;
  private arms = new Map<string, Arm>();

  constructor(seed: number) {
    this.rand = mulberry32(seed);
  }

  private ensure(key: string): Arm {
    let arm = this.arms.get(key);
    if (!arm) { arm = { a: 1, b: 1 }; this.arms.set(key, arm); } // uniform prior
    return arm;
  }

  // ---- samplers -----------------------------------------------------------
  private normal(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.rand();
    while (v === 0) v = this.rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Gamma(shape, 1) via Marsaglia–Tsang. */
  private gamma(shape: number): number {
    if (shape < 1) return this.gamma(shape + 1) * Math.pow(this.rand() || 1e-12, 1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x = this.normal();
      const v = Math.pow(1 + c * x, 3);
      if (v <= 0) continue;
      const u = this.rand();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  private betaSample(a: number, b: number): number {
    const x = this.gamma(a);
    const y = this.gamma(b);
    return x / (x + y);
  }

  // ---- policy -------------------------------------------------------------
  /** Thompson: sample each arm's rate from its posterior, pick the max. */
  select(keys: string[]): string {
    let best = keys[0], bestTheta = -1;
    for (const k of keys) {
      const arm = this.ensure(k);
      const theta = this.betaSample(arm.a, arm.b);
      if (theta > bestTheta) { bestTheta = theta; best = k; }
    }
    return best;
  }

  /** Exploit: pick the arm with the highest posterior mean. */
  best(keys: string[]): string {
    let best = keys[0], bestMean = -1;
    for (const k of keys) {
      const arm = this.ensure(k);
      const mean = arm.a / (arm.a + arm.b);
      if (mean > bestMean) { bestMean = mean; best = k; }
    }
    return best;
  }

  update(key: string, reward: 0 | 1): void {
    const arm = this.ensure(key);
    if (reward === 1) arm.a += 1; else arm.b += 1;
  }

  stat(key: string): { mean: number; pulls: number; a: number; b: number } {
    const arm = this.ensure(key);
    return { mean: arm.a / (arm.a + arm.b), pulls: arm.a + arm.b - 2, a: arm.a, b: arm.b };
  }
}
