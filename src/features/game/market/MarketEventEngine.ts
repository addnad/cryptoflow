import type { MarketEventDef } from "@/types";
import { weightedPick, type Rng } from "@/lib/utils/rng";
import { MARKET_EVENTS } from "./catalog";
import type { DifficultyDirector } from "../systems/DifficultyDirector";

/**
 * Picks the next market event. Difficulty shifts tier weights upward over
 * the run; a short memory of recent picks suppresses repeats so the market
 * feels varied; consecutive same-action gates are damped so the player is
 * forced to actually read the telegraph, not rhythm-mash one verb.
 */
export class MarketEventEngine {
  private recentIds: string[] = [];
  private lastAction: MarketEventDef["bestAction"] | null = null;

  constructor(
    private rng: Rng,
    private difficulty: DifficultyDirector,
  ) {}

  next(): MarketEventDef {
    const def = weightedPick(this.rng, MARKET_EVENTS, (e) => {
      let w = this.difficulty.weightForTier(e.tier);
      if (this.recentIds.includes(e.id)) w *= 0.25;
      if (this.lastAction === e.bestAction) w *= 0.55;
      return w;
    });
    this.recentIds.push(def.id);
    if (this.recentIds.length > 4) this.recentIds.shift();
    this.lastAction = def.bestAction;
    return def;
  }
}
