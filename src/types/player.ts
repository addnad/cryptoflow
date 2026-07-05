/** Identity providers supported now + reserved for the future. */
export type AuthProviderId = "google" | "guest" | "apple";

/** Social providers a guest can sign in with or upgrade to. */
export type SocialProvider = "google" | "apple";

export interface AuthUser {
  uid: string;
  provider: AuthProviderId;
  isAnonymous: boolean;
  email: string | null;
  photoUrl: string | null;
}

/** Canonical persisted player document (`players/{uid}`). */
export interface PlayerProfile {
  uid: string;
  /** Unique handle, lowercase-reserved in `usernames/{username}`. */
  username: string;
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  coins: number;
  bestScore: number;
  bestCombo: number;
  bestPortfolio: number;
  gamesPlayed: number;
  totalDistanceM: number;
  totalCorrect: number;
  /** Epoch milliseconds — kept numeric for trivial converters. */
  createdAt: number;
  lastLoginAt: number;
}

export interface AvatarDef {
  id: string;
  name: string;
  /** Deterministic accent used to tint the silhouette portrait. */
  accent: string;
  /** Short flavour line shown in the picker. */
  bio: string;
}
