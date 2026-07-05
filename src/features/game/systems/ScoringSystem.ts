import { remap } from "@/lib/utils/math";
import type { EventOutcome, MarketEventDef } from "@/types";
import { GAME } from "../engine/config";

/**
 * Score = distance + event resolutions × combo × momentum multiplier.
 * Combo counts consecutive correct reads; any mistake resets it.
 */
export class ScoringSystem {
  private scoreValue = 0;
  private comboValue = 0;
  private bestComboValue = 0;
  private correctValue = 0;
  private mistakesValue = 0;
  private distanceAccum = 0;

  addDistance(meters: number): void {
    this.distanceAccum += meters * GAME.SCORE.PER_METER;
  }

  /** Returns the score awarded for this resolution. */
  resolve(
    def: MarketEventDef,
    outcome: EventOutcome,
    momentum: number,
  ): number {
    if (outcome === "mistake") {
      this.mistakesValue += 1;
      this.comboValue = 0;
      return 0;
    }
    this.correctValue += 1;
    this.comboValue += 1;
    this.bestComboValue = Math.max(this.bestComboValue, this.comboValue);

    const comboMult = Math.min(
      GAME.SCORE.COMBO_MULT_CAP,
      1 + this.comboValue * GAME.SCORE.COMBO_STEP,
    );
    const momentumMult = remap(
      momentum,
      0,
      100,
      GAME.SCORE.MOMENTUM_MULT_MIN,
      GAME.SCORE.MOMENTUM_MULT_MAX,
    );
    const perfectMult = outcome === "perfect" ? GAME.SCORE.PERFECT_MULT : 1;
    const awarded = Math.round(
      def.score * comboMult * momentumMult * perfectMult,
    );
    this.scoreValue += awarded;
    return awarded;
  }

  get score(): number {
    return Math.round(this.scoreValue + this.distanceAccum);
  }
  get combo(): number {
    return this.comboValue;
  }
  get bestCombo(): number {
    return this.bestComboValue;
  }
  get correct(): number {
    return this.correctValue;
  }
  get mistakes(): number {
    return this.mistakesValue;
  }
}
