import { GAME } from "../engine/config";

/**
 * The simulated bag. Event outcomes apply percentage moves; holding high
 * momentum earns a gentle passive yield so flowing feels bullish. Value
 * floors at 5% of the starting stack — the market can humble you, not
 * delete you.
 */
export class PortfolioSystem {
  private valueNow: number = GAME.PORTFOLIO.START;
  private peakValue: number = GAME.PORTFOLIO.START;
  private lastDelta = 0;

  update(dtSeconds: number, momentumT: number): void {
    this.valueNow *= 1 + GAME.PORTFOLIO.FLOW_YIELD_PER_S * momentumT * dtSeconds;
    this.peakValue = Math.max(this.peakValue, this.valueNow);
  }

  /** Apply a fractional move (+0.06 = +6%). Returns the absolute delta. */
  applyMove(fraction: number): number {
    const before = this.valueNow;
    this.valueNow = Math.max(
      GAME.PORTFOLIO.START * 0.05,
      this.valueNow * (1 + fraction),
    );
    this.peakValue = Math.max(this.peakValue, this.valueNow);
    this.lastDelta = this.valueNow - before;
    return this.lastDelta;
  }

  get value(): number {
    return this.valueNow;
  }
  get peak(): number {
    return this.peakValue;
  }
  get delta(): number {
    return this.lastDelta;
  }
}
