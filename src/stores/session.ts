import { create } from "zustand";
import type { AuthUser, PlayerProfile } from "@/types";

/**
 * Where the player is in the identity funnel:
 * booting → signedOut → onboarding (no profile yet) → ready.
 */
export type SessionStatus = "booting" | "signedOut" | "onboarding" | "ready";

interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  profile: PlayerProfile | null;
  setBooting: () => void;
  setSignedOut: () => void;
  setOnboarding: (user: AuthUser) => void;
  setReady: (user: AuthUser, profile: PlayerProfile) => void;
  /** Optimistic local merge — repositories persist the same patch. */
  patchProfile: (patch: Partial<PlayerProfile>) => void;
}

export const useSession = create<SessionState>((set) => ({
  status: "booting",
  user: null,
  profile: null,
  setBooting: () => set({ status: "booting" }),
  setSignedOut: () => set({ status: "signedOut", user: null, profile: null }),
  setOnboarding: (user) => set({ status: "onboarding", user, profile: null }),
  setReady: (user, profile) => set({ status: "ready", user, profile }),
  patchProfile: (patch) =>
    set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),
}));
