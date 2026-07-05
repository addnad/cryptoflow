import type {
  AchievementState,
  AuthUser,
  BoardMetric,
  BoardScope,
  DailyRewardState,
  LeaderboardEntry,
  PlayerProfile,
  RunStats,
  SocialProvider,
} from "@/types";

/**
 * Backend abstraction. UI and gameplay code depend only on these
 * interfaces; `lib/services/index.ts` binds them to Firebase when the app
 * is configured, or to a fully functional local adapter otherwise.
 */

export interface AuthService {
  /** Subscribe to auth changes. Fires immediately with current state. */
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<AuthUser>;
  signInWithApple(): Promise<AuthUser>;
  signInAsGuest(): Promise<AuthUser>;
  /**
   * Upgrade the current anonymous account to a social provider in place. The
   * uid is preserved, so the player's existing profile, stats and unlocks
   * carry over. Throws "credential-in-use" if that account already belongs
   * to another player.
   */
  linkProvider(provider: SocialProvider): Promise<AuthUser>;
  signOutUser(): Promise<void>;
}

export interface PlayerRepository {
  get(uid: string): Promise<PlayerProfile | null>;
  /** Atomically claims the username and creates the profile document. */
  create(profile: PlayerProfile): Promise<void>;
  update(uid: string, patch: Partial<PlayerProfile>): Promise<void>;
  isUsernameAvailable(username: string): Promise<boolean>;
}

export interface LeaderboardService {
  top(
    scope: BoardScope,
    metric: BoardMetric,
    max: number,
  ): Promise<LeaderboardEntry[]>;
  /** Realtime subscription; returns unsubscribe. */
  subscribeTop(
    scope: BoardScope,
    metric: BoardMetric,
    max: number,
    cb: (entries: LeaderboardEntry[]) => void,
  ): () => void;
  submit(entry: LeaderboardEntry): Promise<void>;
}

export interface AchievementsRepository {
  all(uid: string): Promise<AchievementState[]>;
  save(uid: string, states: AchievementState[]): Promise<void>;
}

export interface RewardsRepository {
  get(uid: string): Promise<DailyRewardState>;
  set(uid: string, state: DailyRewardState): Promise<void>;
}

export interface RunsRepository {
  add(uid: string, stats: RunStats): Promise<void>;
}

export interface BackendServices {
  /** True when backed by Firebase; false in local/offline mode. */
  cloud: boolean;
  auth: AuthService;
  players: PlayerRepository;
  leaderboards: LeaderboardService;
  achievements: AchievementsRepository;
  rewards: RewardsRepository;
  runs: RunsRepository;
}
