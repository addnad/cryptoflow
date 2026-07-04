/** Leaderboard scope tabs. */
export type BoardScope = "global" | "weekly" | "friends";
/** Metric each board can rank by. */
export type BoardMetric = "score" | "portfolio" | "combo";

export interface LeaderboardEntry {
  uid: string;
  username: string;
  displayName: string;
  avatarId: string;
  level: number;
  score: number;
  portfolio: number;
  combo: number;
  updatedAt: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  glyph: string;
  /** Progress target (1 for binary achievements). */
  target: number;
  /** Coins granted on unlock. */
  rewardCoins: number;
  secret?: boolean;
}

export interface AchievementState {
  id: string;
  progress: number;
  unlockedAt: number | null;
}

export interface DailyRewardDef {
  day: number;
  coins: number;
  xp: number;
  label: string;
}

export interface DailyRewardState {
  streak: number;
  /** Local day key (YYYY-MM-DD) of the last claim. */
  lastClaimDay: string | null;
}

export type GraphicsQuality = "high" | "balanced" | "battery";

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  haptics: boolean;
  graphics: GraphicsQuality;
  notifications: boolean;
  language: "en";
}
