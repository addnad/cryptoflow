import type { AchievementDef, LeaderboardEntry, RunStats } from "@/types";
import { services } from "@/lib/services";
import { useSession } from "@/stores/session";
import { evaluateAchievements } from "@/features/achievements/engine";
import { levelFromXp } from "./leveling";

export interface RunOutcome {
  newAchievements: AchievementDef[];
  leveledUpTo: number | null;
  isBestScore: boolean;
}

/**
 * The post-run pipeline: merge stats into the profile, persist the run,
 * refresh leaderboard entries, evaluate achievements and grant their coin
 * rewards. Called once from GameScreen when a run ends.
 */
export async function applyRunResults(stats: RunStats): Promise<RunOutcome> {
  const session = useSession.getState();
  const profile = session.profile;
  if (!profile) {
    return { newAchievements: [], leveledUpTo: null, isBestScore: false };
  }

  const backend = await services();
  const prevLevel = levelFromXp(profile.xp).level;
  const isBestScore = stats.score > profile.bestScore;

  const merged = {
    xp: profile.xp + stats.xpEarned,
    coins: profile.coins + stats.coinsEarned,
    bestScore: Math.max(profile.bestScore, stats.score),
    bestCombo: Math.max(profile.bestCombo, stats.bestCombo),
    bestPortfolio: Math.max(profile.bestPortfolio, stats.portfolioPeak),
    gamesPlayed: profile.gamesPlayed + 1,
    totalDistanceM: profile.totalDistanceM + stats.distanceM,
    totalCorrect: profile.totalCorrect + stats.correct,
  };
  const level = levelFromXp(merged.xp).level;

  // Achievements are evaluated against the post-merge profile.
  const states = await backend.achievements.all(profile.uid);
  const { states: nextStates, unlocked } = evaluateAchievements(
    { ...profile, ...merged, level },
    stats,
    states,
  );
  const achievementCoins = unlocked.reduce((s, a) => s + a.rewardCoins, 0);
  const patch = { ...merged, level, coins: merged.coins + achievementCoins };

  session.patchProfile(patch);

  const entry: LeaderboardEntry = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    avatarId: profile.avatarId,
    level,
    score: patch.bestScore,
    portfolio: patch.bestPortfolio,
    combo: patch.bestCombo,
    updatedAt: Date.now(),
  };

  // Fire-and-forget persistence — gameplay must never wait on the network.
  await Promise.allSettled([
    backend.players.update(profile.uid, patch),
    backend.runs.add(profile.uid, stats),
    backend.leaderboards.submit(entry),
    backend.achievements.save(profile.uid, nextStates),
  ]);

  return {
    newAchievements: unlocked,
    leveledUpTo: level > prevLevel ? level : null,
    isBestScore,
  };
}
