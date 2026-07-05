import type {
  AchievementDef,
  AchievementState,
  PlayerProfile,
  RunStats,
} from "@/types";
import { GAME } from "@/features/game/engine/config";
import { ACHIEVEMENTS } from "./definitions";

/**
 * Pure achievement evaluation: given the post-run profile and the run's
 * stats, produce updated progress states and the list of newly unlocked
 * definitions. Persistence and reward granting happen in progression.ts.
 */
export function evaluateAchievements(
  profile: PlayerProfile,
  run: RunStats,
  states: AchievementState[],
): { states: AchievementState[]; unlocked: AchievementDef[] } {
  const byId = new Map(states.map((s) => [s.id, s]));
  const unlocked: AchievementDef[] = [];
  const now = Date.now();

  const progressOf = (def: AchievementDef): number => {
    switch (def.id) {
      case "first-run":
        return profile.gamesPlayed >= 1 ? 1 : 0;
      case "bull-runner":
        return run.distanceM;
      case "diamond-hands":
        return run.portfolioFinal >= GAME.PORTFOLIO.START * 2 ? 1 : 0;
      case "whale-rider":
        return run.portfolioPeak;
      case "perfect-flow":
        return run.mistakes === 0 ? run.correct : 0;
      case "bear-survivor":
        return run.mistakes >= 8 && run.distanceM >= 800 ? 1 : 0;
      case "combo-100":
        return run.bestCombo;
      case "millionaire":
        return run.portfolioPeak;
      case "marathon":
        return profile.totalDistanceM;
      case "veteran":
        return profile.gamesPlayed;
      default:
        return 0;
    }
  };

  const next: AchievementState[] = ACHIEVEMENTS.map((def) => {
    const prev = byId.get(def.id) ?? {
      id: def.id,
      progress: 0,
      unlockedAt: null,
    };
    if (prev.unlockedAt) return prev;
    const progress = Math.max(prev.progress, progressOf(def));
    if (progress >= def.target) {
      unlocked.push(def);
      return { id: def.id, progress: def.target, unlockedAt: now };
    }
    return { id: def.id, progress, unlockedAt: null };
  });

  return { states: next, unlocked };
}
