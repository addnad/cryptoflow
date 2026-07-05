import { services } from "@/lib/services";
import { useSession } from "@/stores/session";
import type { AuthUser, PlayerProfile } from "@/types";

/**
 * Session controller — the only module that mutates the session store.
 * Boots the auth listener, routes users through onboarding on first login,
 * and keeps `lastLoginAt` fresh.
 */

let booted = false;

export function bootSession(): void {
  if (booted) return;
  booted = true;

  void services().then((backend) => {
    backend.auth.onChange((user) => {
      void resolveUser(user);
    });
  });
}

async function resolveUser(user: AuthUser | null): Promise<void> {
  const session = useSession.getState();
  if (!user) {
    session.setSignedOut();
    return;
  }
  const backend = await services();
  const profile = await backend.players.get(user.uid);
  if (!profile) {
    session.setOnboarding(user);
    return;
  }
  const lastLoginAt = Date.now();
  void backend.players.update(user.uid, { lastLoginAt });
  session.setReady(user, { ...profile, lastLoginAt });
}

export async function signInWithGoogle(): Promise<void> {
  const backend = await services();
  await backend.auth.signInWithGoogle();
}

export async function signInAsGuest(): Promise<void> {
  const backend = await services();
  await backend.auth.signInAsGuest();
}

/**
 * Upgrade the signed-in guest to a Google account. The uid is preserved so
 * the profile carries over; we optimistically flip the local session's
 * provider flags and let the auth listener reconcile. Throws
 * "credential-in-use" when the Google account is already taken.
 */
export async function linkGuestToGoogle(): Promise<void> {
  const backend = await services();
  const linked = await backend.auth.linkGoogle();
  const { profile } = useSession.getState();
  if (profile) useSession.getState().setReady(linked, profile);
}

export async function signOutUser(): Promise<void> {
  const backend = await services();
  await backend.auth.signOutUser();
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const backend = await services();
  return backend.players.isUsernameAvailable(username);
}

/** Creates the profile document and promotes the session to ready. */
export async function completeOnboarding(input: {
  username: string;
  displayName: string;
  avatarId: string;
}): Promise<void> {
  const { user } = useSession.getState();
  if (!user) throw new Error("No authenticated user.");
  const now = Date.now();
  const profile: PlayerProfile = {
    uid: user.uid,
    username: input.username.toLowerCase(),
    displayName: input.displayName.trim(),
    avatarId: input.avatarId,
    level: 1,
    xp: 0,
    coins: 0,
    bestScore: 0,
    bestCombo: 0,
    bestPortfolio: 0,
    gamesPlayed: 0,
    totalDistanceM: 0,
    totalCorrect: 0,
    createdAt: now,
    lastLoginAt: now,
  };
  const backend = await services();
  await backend.players.create(profile);
  useSession.getState().setReady(user, profile);
}

/** Persist a partial profile update and mirror it locally. */
export async function updateProfile(
  patch: Partial<PlayerProfile>,
): Promise<void> {
  const { user } = useSession.getState();
  if (!user) return;
  useSession.getState().patchProfile(patch);
  const backend = await services();
  await backend.players.update(user.uid, patch);
}
