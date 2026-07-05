/**
 * Central gameplay tuning. Every balance decision lives here — systems must
 * not hard-code numbers. Units: px are world pixels at design resolution,
 * distance meters are world px / PX_PER_METER.
 */
export const GAME = {
  /** Design resolution (portrait). Phaser scales with FIT. */
  WIDTH: 480,
  HEIGHT: 854,

  PX_PER_METER: 48,

  /** Where the trader is anchored on screen. */
  PLAYER_SCREEN_X: 150,
  GROUND_Y: 660,

  /** World speed as a function of momentum (px/s). */
  SPEED_MIN: 250,
  SPEED_MAX: 620,

  /** Vertical physics. */
  GRAVITY: 2600,
  JUMP_VELOCITY: -950,
  DOUBLE_JUMP_VELOCITY: -820,
  SLIDE_DURATION_MS: 620,
  DASH_DURATION_MS: 420,
  /** Exit-position dash: brief backward phase shift (px at peak). */
  EXIT_DASH_OFFSET: -64,
  /** Rotate-position dash: forward surge (px at peak). */
  ROTATE_DASH_OFFSET: 72,

  MOMENTUM: {
    START: 55,
    /** Passive decay per second — flow must be earned continuously. */
    DECAY_PER_S: 1.4,
    /** Momentum tax for swiping with no event in range. */
    WASTED_MOVE: 2,
    /** Extra momentum for a perfectly timed read. */
    PERFECT_BONUS: 2,
  },

  BEAR: {
    /** Proximity spring half-life (s) — how fast tension builds/releases. */
    HALF_LIFE: 1.6,
    /** Instant proximity impulse added per mistake. */
    MISTAKE_IMPULSE: 0.22,
    /** Max screen intrusion of the wavefront in px (proximity = 1 kills). */
    MAX_INTRUSION: 190,
  },

  PORTFOLIO: {
    START: 10_000,
    /** Passive drift per second at full momentum (annualised optimism). */
    FLOW_YIELD_PER_S: 0.0012,
  },

  SCORE: {
    PER_METER: 2,
    /** Combo multiplier step per correct read (multiplier = 1 + combo*step). */
    COMBO_STEP: 0.1,
    COMBO_MULT_CAP: 4,
    PERFECT_MULT: 1.5,
    /** Momentum multiplier range applied on top (at 0 vs 100 momentum). */
    MOMENTUM_MULT_MIN: 0.8,
    MOMENTUM_MULT_MAX: 1.6,
  },

  DIFFICULTY: {
    /** Distance (m) over which the game reaches peak difficulty. */
    RAMP_METERS: 2800,
    /** Gate spacing in px at difficulty 0 → 1. */
    SPACING_START: 560,
    SPACING_END: 320,
    /** Reaction window in ms at difficulty 0 → 1 (converted to px by speed). */
    WINDOW_START_MS: 720,
    WINDOW_END_MS: 430,
    /** Tier spawn weights at difficulty 0 and 1: [t1, t2, t3]. */
    TIER_WEIGHTS_START: [0.72, 0.25, 0.03] as const,
    TIER_WEIGHTS_END: [0.22, 0.44, 0.34] as const,
  },

  /** Environment switches every N meters. */
  ENVIRONMENT_LENGTH_M: 600,

  XP: {
    PER_METER: 0.35,
    PER_CORRECT: 6,
    PER_COMBO_BEST: 2.5,
  },
  COINS: {
    PER_500_SCORE: 1,
    PER_CORRECT: 1,
  },

  /** HUD snapshot cadence (ms). */
  HUD_THROTTLE_MS: 100,
} as const;
