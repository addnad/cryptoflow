import { clamp01, lerp } from "@/lib/utils/math";
import { GAME } from "../engine/config";
import type { EventTier } from "@/types";

/**
 * Distance-driven difficulty curve. Exposes the three levers the spawner
 * needs: gate spacing, reaction window, and tier weighting. The curve eases
 * (sqrt) so the first minutes ramp quickly to interesting, then difficulty
 * creeps toward its ceiling.
 */
export class DifficultyDirector {
  private t01 = 0;

  update(distanceM: number): void {
    this.t01 = Math.sqrt(clamp01(distanceM / GAME.DIFFICULTY.RAMP_METERS));
  }

  /** 0..1 difficulty. */
  get t(): number {
    return this.t01;
  }

  /** Px between gate decision lines. */
  get gateSpacing(): number {
    return lerp(
      GAME.DIFFICULTY.SPACING_START,
      GAME.DIFFICULTY.SPACING_END,
      this.t01,
    );
  }

  /** Reaction window in ms. */
  get windowMs(): number {
    return lerp(
      GAME.DIFFICULTY.WINDOW_START_MS,
      GAME.DIFFICULTY.WINDOW_END_MS,
      this.t01,
    );
  }

  weightForTier(tier: EventTier): number {
    const start = GAME.DIFFICULTY.TIER_WEIGHTS_START[tier - 1];
    const end = GAME.DIFFICULTY.TIER_WEIGHTS_END[tier - 1];
    return lerp(start, end, this.t01);
  }
}
