import type { DailyRewardDef, DailyRewardState } from "@/types";
import { dayKey, previousDayKey } from "@/lib/utils/time";
import { services } from "@/lib/services";

/**
 * Seven-day login streak. Missing a day resets to day 1; day 7 is the
 * jackpot, after which the cycle repeats at day 1.
 */
export const DAILY_REWARDS: readonly DailyRewardDef[] = [
  { day: 1, coins: 50, xp: 40, label: "Warm-up" },
  { day: 2, coins: 75, xp: 60, label: "Back again" },
  { day: 3, coins: 110, xp: 90, label: "Consistent" },
  { day: 4, coins: 150, xp: 120, label: "Committed" },
  { day: 5, coins: 200, xp: 160, label: "Relentless" },
  { day: 6, coins: 275, xp: 210, label: "Unshakeable" },
  { day: 7, coins: 400, xp: 320, label: "Diamond streak" },
] as const;

export interface RewardStatus {
  state: DailyRewardState;
  /** The reward claimable today (null if already claimed). */
  claimable: DailyRewardDef | null;
  /** Day index (1..7) tonight's claim would land on. */
  nextDay: number;
}

export function evaluateRewards(state: DailyRewardState): RewardStatus {
  const today = dayKey();
  if (state.lastClaimDay === today) {
    return { state, claimable: null, nextDay: ((state.streak - 1) % 7) + 1 };
  }
  const continues = state.lastClaimDay === previousDayKey();
  const streak = continues ? state.streak + 1 : 1;
  const nextDay = ((streak - 1) % 7) + 1;
  return { state, claimable: DAILY_REWARDS[nextDay - 1]!, nextDay };
}

export async function fetchRewardStatus(uid: string): Promise<RewardStatus> {
  const backend = await services();
  return evaluateRewards(await backend.rewards.get(uid));
}

/** Claims today's reward; returns the granted def or null if not claimable. */
export async function claimDailyReward(
  uid: string,
): Promise<DailyRewardDef | null> {
  const backend = await services();
  const status = evaluateRewards(await backend.rewards.get(uid));
  if (!status.claimable) return null;
  const continues = status.state.lastClaimDay === previousDayKey();
  await backend.rewards.set(uid, {
    streak: continues ? status.state.streak + 1 : 1,
    lastClaimDay: dayKey(),
  });
  return status.claimable;
}
