/**
 * XP / level curve.
 *
 * Cost to advance from level n to n+1 grows gently quadratically, so early
 * levels land during the first sessions (onboarding hooks) while later
 * levels become long-term goals.
 */
const BASE_XP = 120;
const GROWTH = 1.35;

export function xpForLevel(level: number): number {
  return Math.round(BASE_XP * Math.pow(level, GROWTH));
}

export interface LevelProgress {
  level: number;
  /** XP accumulated inside the current level. */
  intoLevel: number;
  /** XP needed to finish the current level. */
  needed: number;
  /** 0..1 progress through the current level. */
  fraction: number;
}

export function levelFromXp(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level) && level < 200) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const needed = xpForLevel(level);
  return { level, intoLevel: remaining, needed, fraction: remaining / needed };
}
