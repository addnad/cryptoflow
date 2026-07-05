import { clamp, remap } from "@/lib/utils/math";
import { GAME } from "../engine/config";

/**
 * Momentum — the core stat. 0..100. Everything reads from here: world
 * speed, music intensity, bear distance, score multiplier, run cadence.
 * Correct reads add, mistakes subtract, and it always decays a little so
 * flow has to be continuously earned.
 */
export class MomentumSystem {
  private momentum: number = GAME.MOMENTUM.START;

  update(dtSeconds: number): void {
    this.momentum = clamp(
      this.momentum - GAME.MOMENTUM.DECAY_PER_S * dtSeconds,
      0,
      100,
    );
  }

  add(amount: number): void {
    this.momentum = clamp(this.momentum + amount, 0, 100);
  }

  get value(): number {
    return this.momentum;
  }

  /** 0..1 normalised. */
  get t(): number {
    return this.momentum / 100;
  }

  /** Current world speed in px/s. */
  get speed(): number {
    return remap(this.momentum, 0, 100, GAME.SPEED_MIN, GAME.SPEED_MAX);
  }
}
