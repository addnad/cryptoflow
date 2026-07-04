import type { EventOutcome, PlayerAction } from "./market";

export type RunPhase = "ready" | "running" | "paused" | "over";

export type RunEndReason = "bear" | "fall" | "quit";

/** Immutable summary produced when a run ends. */
export interface RunStats {
  score: number;
  distanceM: number;
  bestCombo: number;
  correct: number;
  mistakes: number;
  portfolioPeak: number;
  portfolioFinal: number;
  durationMs: number;
  seed: number;
  environmentsVisited: number;
  endedBy: RunEndReason;
  xpEarned: number;
  coinsEarned: number;
}

/** Throttled snapshot streamed from Phaser to the React HUD. */
export interface HudSnapshot {
  score: number;
  distanceM: number;
  combo: number;
  momentum: number;
  portfolio: number;
  portfolioDelta: number;
  bearProximity: number;
  environmentName: string;
}

/** Fired when a gate resolves — powers HUD toasts + haptics + audio. */
export interface EventResolution {
  eventId: string;
  title: string;
  outcome: EventOutcome;
  action: PlayerAction | null;
  bestAction: PlayerAction;
  scoreDelta: number;
  portfolioDelta: number;
  combo: number;
}
