import { create } from "zustand";
import type {
  EventResolution,
  HudSnapshot,
  RunPhase,
  RunStats,
} from "@/types";

const EMPTY_HUD: HudSnapshot = {
  score: 0,
  distanceM: 0,
  combo: 0,
  momentum: 55,
  portfolio: 10_000,
  portfolioDelta: 0,
  bearProximity: 0,
  environmentName: "Ethereum City",
};

interface RunState {
  phase: RunPhase;
  hud: HudSnapshot;
  /** Most recent gate resolution — HUD toast reads then clears it. */
  resolution: EventResolution | null;
  lastRun: RunStats | null;
  setPhase: (phase: RunPhase) => void;
  setHud: (hud: HudSnapshot) => void;
  setResolution: (r: EventResolution | null) => void;
  finishRun: (stats: RunStats) => void;
  resetRun: () => void;
}

/**
 * Bridge store between the Phaser world and the React HUD. Written to at a
 * throttled cadence by GameEventBus subscribers — never inside the game loop.
 */
export const useRun = create<RunState>((set) => ({
  phase: "ready",
  hud: EMPTY_HUD,
  resolution: null,
  lastRun: null,
  setPhase: (phase) => set({ phase }),
  setHud: (hud) => set({ hud }),
  setResolution: (resolution) => set({ resolution }),
  finishRun: (stats) => set({ phase: "over", lastRun: stats }),
  resetRun: () => set({ phase: "ready", hud: EMPTY_HUD, resolution: null }),
}));
