/**
 * Deterministic seeded RNG (mulberry32). Every run is seeded so procedural
 * generation is replayable — the seed is stored with the run record, which
 * also lets Cloud Functions re-simulate suspicious scores.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newRunSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick() from empty list");
  return item;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Weighted pick — weights need not sum to 1. */
export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weightOf: (item: T) => number,
): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll <= 0) return item;
  }
  const last = items[items.length - 1];
  if (last === undefined) throw new Error("weightedPick() from empty list");
  return last;
}
