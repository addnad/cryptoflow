import { create } from "zustand";

/**
 * Screen state machine. The app never navigates by URL — screens are pushed
 * onto a stack so the Android hardware back button and swipe-back gestures
 * behave natively.
 */
export type ScreenId =
  | "splash"
  | "auth"
  | "onboarding"
  | "home"
  | "game"
  | "profile"
  | "leaderboard"
  | "achievements"
  | "rewards"
  | "tutorial"
  | "settings"
  | "about";

interface NavigationState {
  stack: ScreenId[];
  screen: ScreenId;
  /** +1 = drilling deeper, -1 = returning. Drives transition direction. */
  direction: 1 | -1;
  go: (screen: ScreenId) => void;
  back: () => void;
  /** Clears history — used after auth/onboarding and when leaving a run. */
  reset: (screen: ScreenId) => void;
}

export const useNavigation = create<NavigationState>((set, get) => ({
  stack: ["splash"],
  screen: "splash",
  direction: 1,

  go: (screen) => {
    if (get().screen === screen) return;
    set((s) => ({ stack: [...s.stack, screen], screen, direction: 1 }));
  },

  back: () => {
    const { stack } = get();
    if (stack.length <= 1) return;
    const next = stack.slice(0, -1);
    const screen = next[next.length - 1];
    if (!screen) return;
    set({ stack: next, screen, direction: -1 });
  },

  reset: (screen) => set({ stack: [screen], screen, direction: 1 }),
}));
