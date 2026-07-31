/** Deterministic PRNG (mulberry32) so combat simulation is reproducible and testable. */
export class Rng {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed | 0;
  }

  next(): number {
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
