/** The four swipe verbs. Every market event demands exactly one. */
export type PlayerAction = "jump" | "slide" | "exit" | "rotate";

/** Difficulty tier of an individual event (drives spawn weighting). */
export type EventTier = 1 | 2 | 3;

/** How an event gate resolved for the player. */
export type EventOutcome = "perfect" | "clean" | "mistake";

/**
 * A market event definition — every obstacle in the game world is one of
 * these. Purely declarative; the engine interprets it.
 */
export interface MarketEventDef {
  id: string;
  title: string;
  description: string;
  tier: EventTier;
  bestAction: PlayerAction;
  /** Single glyph painted on the telegraph beacon. */
  glyph: string;
  /** Muted accent colour for telegraph + particles (hex). */
  tint: number;
  /** Momentum gained on a correct read. */
  momentumReward: number;
  /** Momentum lost on a wrong read / no reaction. */
  momentumPenalty: number;
  /** Portfolio % move on success (e.g. 0.06 = +6%). */
  portfolioReward: number;
  /** Portfolio % drawdown on failure (positive number). */
  portfolioPenalty: number;
  /** Base score for a clean resolution. */
  score: number;
  /** SFX voice the SoundDirector plays on resolution. */
  sound: "surge" | "alarm" | "glitch" | "chime";
}

/** A live gate instance travelling toward the player. */
export interface EventGate {
  def: MarketEventDef;
  /** World x position of the decision line. */
  worldX: number;
  resolved: boolean;
}
