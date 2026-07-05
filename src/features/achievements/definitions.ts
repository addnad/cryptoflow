import type { AchievementDef } from "@/types";

/**
 * Achievement catalog. Every definition is evaluable purely from
 * (profile, runStats) so unlock checks stay deterministic and cheap.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first-run",
    title: "First Steps",
    description: "Finish your first run.",
    glyph: "⚑",
    target: 1,
    rewardCoins: 25,
  },
  {
    id: "bull-runner",
    title: "Bull Runner",
    description: "Cover 2 km in a single run.",
    glyph: "↟",
    target: 2000,
    rewardCoins: 100,
  },
  {
    id: "diamond-hands",
    title: "Diamond Hands",
    description: "Double your portfolio in one run.",
    glyph: "◈",
    target: 1,
    rewardCoins: 150,
  },
  {
    id: "whale-rider",
    title: "Whale Rider",
    description: "Grow a run portfolio past $100K.",
    glyph: "≈",
    target: 100_000,
    rewardCoins: 200,
  },
  {
    id: "perfect-flow",
    title: "Perfect Flow",
    description: "Resolve 15 events in a run without a single mistake.",
    glyph: "∿",
    target: 15,
    rewardCoins: 250,
  },
  {
    id: "bear-survivor",
    title: "Bear Survivor",
    description: "Take 8 hits in one run and still cover 800 m.",
    glyph: "☍",
    target: 1,
    rewardCoins: 150,
  },
  {
    id: "combo-100",
    title: "100 Combo",
    description: "Chain 100 correct reads.",
    glyph: "Σ",
    target: 100,
    rewardCoins: 500,
  },
  {
    id: "millionaire",
    title: "Million Dollar Portfolio",
    description: "Hold a $1,000,000 portfolio in a single run.",
    glyph: "M",
    target: 1_000_000,
    rewardCoins: 1000,
  },
  {
    id: "marathon",
    title: "Marathoner",
    description: "Run 10 km lifetime distance.",
    glyph: "∞",
    target: 10_000,
    rewardCoins: 300,
  },
  {
    id: "veteran",
    title: "Market Veteran",
    description: "Play 50 runs.",
    glyph: "L",
    target: 50,
    rewardCoins: 400,
  },
] as const;

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
