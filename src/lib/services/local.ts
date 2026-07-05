import type {
  AchievementState,
  AuthUser,
  BoardMetric,
  BoardScope,
  DailyRewardState,
  LeaderboardEntry,
  PlayerProfile,
  RunStats,
} from "@/types";
import type { BackendServices } from "./types";

/**
 * Local backend adapter.
 *
 * Used when Firebase env vars are absent (development, CI, offline demos).
 * Implements the full services contract on top of localStorage so the
 * entire game — auth funnel, profile, leaderboards, rewards — remains
 * playable with zero configuration. "Google" sign-in here simply creates a
 * local account tagged as google, purely to exercise the UI flow.
 */

const KEY = {
  user: "cryptoflow.local.user",
  profile: (uid: string) => `cryptoflow.local.profile.${uid}`,
  usernames: "cryptoflow.local.usernames",
  achievements: (uid: string) => `cryptoflow.local.achievements.${uid}`,
  rewards: (uid: string) => `cryptoflow.local.rewards.${uid}`,
  runs: (uid: string) => `cryptoflow.local.runs.${uid}`,
  board: "cryptoflow.local.board",
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Fictional rivals so offline leaderboards feel inhabited. */
const SEED_RIVALS: LeaderboardEntry[] = [
  { uid: "bot-1", username: "satoshi_ghost", displayName: "Satoshi Ghost", avatarId: "oracle", level: 14, score: 128_400, portfolio: 412_000, combo: 74, updatedAt: 0 },
  { uid: "bot-2", username: "gwei_runner", displayName: "Gwei Runner", avatarId: "drift", level: 11, score: 96_150, portfolio: 268_500, combo: 58, updatedAt: 0 },
  { uid: "bot-3", username: "mev_shadow", displayName: "MEV Shadow", avatarId: "ronin", level: 9, score: 71_800, portfolio: 190_300, combo: 41, updatedAt: 0 },
  { uid: "bot-4", username: "hodl_queen", displayName: "HODL Queen", avatarId: "nova", level: 8, score: 54_020, portfolio: 121_700, combo: 37, updatedAt: 0 },
  { uid: "bot-5", username: "block_wanderer", displayName: "Block Wanderer", avatarId: "sable", level: 6, score: 32_260, portfolio: 74_900, combo: 25, updatedAt: 0 },
  { uid: "bot-6", username: "fee_dodger", displayName: "Fee Dodger", avatarId: "ledger", level: 4, score: 15_480, portfolio: 38_200, combo: 16, updatedAt: 0 },
];

type Listener = (user: AuthUser | null) => void;

export function createLocalServices(): BackendServices {
  const listeners = new Set<Listener>();
  let current: AuthUser | null = read<AuthUser>(KEY.user);

  const emit = () => listeners.forEach((cb) => cb(current));

  const setUser = (user: AuthUser | null) => {
    current = user;
    if (user) write(KEY.user, user);
    else localStorage.removeItem(KEY.user);
    emit();
  };

  const makeUser = (provider: AuthUser["provider"]): AuthUser => ({
    uid: `local-${provider}-${Math.random().toString(36).slice(2, 10)}`,
    provider,
    isAnonymous: provider === "guest",
    email: provider === "google" ? "trader@local.dev" : null,
    photoUrl: null,
  });

  const boardEntries = (): LeaderboardEntry[] =>
    read<LeaderboardEntry[]>(KEY.board) ?? [...SEED_RIVALS];

  const sortBoard = (
    entries: LeaderboardEntry[],
    metric: BoardMetric,
  ): LeaderboardEntry[] =>
    [...entries].sort((a, b) => b[metric] - a[metric]);

  const filterScope = (
    entries: LeaderboardEntry[],
    scope: BoardScope,
  ): LeaderboardEntry[] => {
    if (scope !== "friends") return entries;
    // Offline "friends" = your closest rivals (see ARCHITECTURE §7).
    const uid = current?.uid;
    const idx = entries.findIndex((e) => e.uid === uid);
    if (idx < 0) return entries.slice(0, 5);
    return entries.slice(Math.max(0, idx - 2), idx + 3);
  };

  return {
    cloud: false,

    auth: {
      onChange(cb) {
        listeners.add(cb);
        cb(current);
        return () => listeners.delete(cb);
      },
      async signInWithGoogle() {
        const user = makeUser("google");
        setUser(user);
        return user;
      },
      async signInAsGuest() {
        const user = makeUser("guest");
        setUser(user);
        return user;
      },
      async signOutUser() {
        setUser(null);
      },
    },

    players: {
      async get(uid) {
        return read<PlayerProfile>(KEY.profile(uid));
      },
      async create(profile) {
        const usernames = read<Record<string, string>>(KEY.usernames) ?? {};
        const lower = profile.username.toLowerCase();
        if (usernames[lower] && usernames[lower] !== profile.uid) {
          throw new Error("username-taken");
        }
        usernames[lower] = profile.uid;
        write(KEY.usernames, usernames);
        write(KEY.profile(profile.uid), profile);
      },
      async update(uid, patch) {
        const existing = read<PlayerProfile>(KEY.profile(uid));
        if (!existing) return;
        write(KEY.profile(uid), { ...existing, ...patch });
      },
      async isUsernameAvailable(username) {
        const usernames = read<Record<string, string>>(KEY.usernames) ?? {};
        const owner = usernames[username.toLowerCase()];
        return !owner || owner === current?.uid;
      },
    },

    leaderboards: {
      top: async (scope, metric, max) =>
        filterScope(sortBoard(boardEntries(), metric), scope).slice(0, max),
      subscribeTop(scope, metric, max, cb) {
        cb(filterScope(sortBoard(boardEntries(), metric), scope).slice(0, max));
        return () => undefined;
      },
      async submit(entry) {
        const entries = boardEntries().filter((e) => e.uid !== entry.uid);
        entries.push(entry);
        write(KEY.board, entries);
      },
    },

    achievements: {
      async all(uid) {
        return read<AchievementState[]>(KEY.achievements(uid)) ?? [];
      },
      async save(uid, states) {
        write(KEY.achievements(uid), states);
      },
    },

    rewards: {
      async get(uid) {
        return (
          read<DailyRewardState>(KEY.rewards(uid)) ?? {
            streak: 0,
            lastClaimDay: null,
          }
        );
      },
      async set(uid, state) {
        write(KEY.rewards(uid), state);
      },
    },

    runs: {
      async add(uid, stats: RunStats) {
        const runs = read<RunStats[]>(KEY.runs(uid)) ?? [];
        runs.unshift(stats);
        write(KEY.runs(uid), runs.slice(0, 50));
      },
    },
  };
}

export type { AchievementState, DailyRewardState };
