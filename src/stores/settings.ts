import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameSettings } from "@/types";

interface SettingsState extends GameSettings {
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setHaptics: (on: boolean) => void;
  setGraphics: (g: GameSettings["graphics"]) => void;
  setNotifications: (on: boolean) => void;
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.9,
  haptics: true,
  graphics: "high",
  notifications: true,
  language: "en",
};

/**
 * Persisted locally (localStorage inside the Capacitor WebView) — settings
 * are device preferences, not cloud state.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
      setHaptics: (haptics) => set({ haptics }),
      setGraphics: (graphics) => set({ graphics }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: "cryptoflow.settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
