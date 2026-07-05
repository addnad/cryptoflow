/**
 * Pose model + keyframe library for the silhouette rig.
 *
 * Conventions (radians):
 * - Leg `a1` = hip angle from straight-down, positive swings forward.
 *   Leg `bend` >= 0 flexes the knee (shin rotates backward).
 * - Arm `a1` = shoulder angle from straight-down, positive forward.
 *   Arm `bend` >= 0 flexes the elbow (forearm rotates forward).
 * - `lean` = torso angle from vertical, positive forward.
 * - `rot` = whole-body rotation (flips/rolls), applied at the container.
 * - `drop` = hip drop in px (crouch/slide).
 */
export interface LimbPose {
  a1: number;
  bend: number;
}

export interface Pose {
  lean: number;
  drop: number;
  rot: number;
  headTuck: number;
  legL: LimbPose;
  legR: LimbPose;
  armL: LimbPose;
  armR: LimbPose;
}

export const BONES = {
  THIGH: 21,
  SHIN: 20,
  TORSO: 30,
  UPPER_ARM: 15,
  FOREARM: 14,
  HEAD_R: 7,
  /** Standing hip height above the ground line. */
  HIP_HEIGHT: 39,
} as const;

const BASE: Pose = {
  lean: 0.1,
  drop: 0,
  rot: 0,
  headTuck: 0,
  legL: { a1: 0, bend: 0.1 },
  legR: { a1: 0, bend: 0.1 },
  armL: { a1: 0, bend: 0.4 },
  armR: { a1: 0, bend: 0.4 },
};

export function mkPose(p: Partial<Pose>): Pose {
  return {
    ...BASE,
    ...p,
    legL: { ...BASE.legL, ...p.legL },
    legR: { ...BASE.legR, ...p.legR },
    armL: { ...BASE.armL, ...p.armL },
    armR: { ...BASE.armR, ...p.armR },
  };
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const l = (x: number, y: number) => x + (y - x) * t;
  const limb = (x: LimbPose, y: LimbPose): LimbPose => ({
    a1: l(x.a1, y.a1),
    bend: l(x.bend, y.bend),
  });
  return {
    lean: l(a.lean, b.lean),
    drop: l(a.drop, b.drop),
    rot: l(a.rot, b.rot),
    headTuck: l(a.headTuck, b.headTuck),
    legL: limb(a.legL, b.legL),
    legR: limb(a.legR, b.legR),
    armL: limb(a.armL, b.armL),
    armR: limb(a.armR, b.armR),
  };
}

/**
 * Parametric run cycle — cadence follows world speed so the stride
 * naturally quickens with momentum. `phase` advances 2π per stride.
 */
export function runPose(phase: number, speedT: number): Pose {
  const s = Math.sin(phase);
  const sOpp = Math.sin(phase + Math.PI);
  const lift = Math.max(0, Math.sin(phase + 0.85));
  const liftOpp = Math.max(0, Math.sin(phase + Math.PI + 0.85));
  return mkPose({
    lean: 0.16 + 0.15 * speedT,
    drop: 2.4 * Math.abs(Math.cos(phase)),
    legL: { a1: (0.72 + 0.22 * speedT) * s, bend: 0.15 + 1.15 * lift },
    legR: { a1: (0.72 + 0.22 * speedT) * sOpp, bend: 0.15 + 1.15 * liftOpp },
    armL: { a1: 0.62 * sOpp - 0.05, bend: 0.85 },
    armR: { a1: 0.62 * s - 0.05, bend: 0.85 },
  });
}

/** Standing idle with a slow breath. */
export function idlePose(timeSec: number): Pose {
  const breath = Math.sin(timeSec * 1.7);
  return mkPose({
    lean: 0.04 + 0.012 * breath,
    drop: 1.2 + 0.8 * breath,
    legL: { a1: 0.06, bend: 0.12 },
    legR: { a1: -0.08, bend: 0.1 },
    armL: { a1: 0.06, bend: 0.35 + 0.03 * breath },
    armR: { a1: -0.06, bend: 0.35 + 0.03 * breath },
  });
}

export interface Keyframe {
  at: number;
  pose: Pose;
}

export interface ActionClip {
  duration: number;
  frames: Keyframe[];
  /** Hold the final frame until the controller releases the state. */
  hold?: boolean;
}

/** Keyframe clips for every non-locomotion state. */
export const CLIPS = {
  jump: {
    duration: 420,
    hold: true,
    frames: [
      // launch: legs split, arms thrown up-back
      {
        at: 0,
        pose: mkPose({
          lean: 0.22,
          legL: { a1: 0.95, bend: 0.35 },
          legR: { a1: -0.75, bend: 0.8 },
          armL: { a1: -0.5, bend: 0.5 },
          armR: { a1: 0.85, bend: 0.6 },
        }),
      },
      // apex: graceful extension
      {
        at: 0.55,
        pose: mkPose({
          lean: 0.12,
          legL: { a1: 0.55, bend: 0.9 },
          legR: { a1: -0.5, bend: 1.25 },
          armL: { a1: -0.35, bend: 0.4 },
          armR: { a1: 0.55, bend: 0.45 },
        }),
      },
      // preparing to land
      {
        at: 1,
        pose: mkPose({
          lean: 0.2,
          legL: { a1: 0.35, bend: 0.5 },
          legR: { a1: -0.15, bend: 0.4 },
          armL: { a1: -0.2, bend: 0.5 },
          armR: { a1: 0.3, bend: 0.5 },
        }),
      },
    ],
  },
  doubleJump: {
    duration: 520,
    hold: true,
    frames: [
      {
        at: 0,
        pose: mkPose({
          rot: 0,
          headTuck: 0.4,
          legL: { a1: 0.9, bend: 1.6 },
          legR: { a1: 0.6, bend: 1.7 },
          armL: { a1: 0.9, bend: 1.4 },
          armR: { a1: 0.9, bend: 1.4 },
        }),
      },
      // full tucked flip
      {
        at: 0.75,
        pose: mkPose({
          rot: Math.PI * 2 * 0.85,
          headTuck: 1,
          legL: { a1: 1.1, bend: 2.1 },
          legR: { a1: 0.9, bend: 2.2 },
          armL: { a1: 1.1, bend: 1.8 },
          armR: { a1: 1.1, bend: 1.8 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          rot: Math.PI * 2,
          headTuck: 0.1,
          legL: { a1: 0.4, bend: 0.5 },
          legR: { a1: -0.2, bend: 0.45 },
          armL: { a1: -0.25, bend: 0.5 },
          armR: { a1: 0.35, bend: 0.5 },
        }),
      },
    ],
  },
  slide: {
    duration: 620,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: -0.5,
          drop: 18,
          legL: { a1: 1.1, bend: 0.2 },
          legR: { a1: 0.1, bend: 1.9 },
          armL: { a1: -0.7, bend: 0.4 },
          armR: { a1: 0.4, bend: 0.9 },
        }),
      },
      // deep glide
      {
        at: 0.35,
        pose: mkPose({
          lean: -0.92,
          drop: 27,
          headTuck: 0.2,
          legL: { a1: 1.35, bend: 0.1 },
          legR: { a1: 0.25, bend: 2.1 },
          armL: { a1: -0.9, bend: 0.3 },
          armR: { a1: 0.5, bend: 1.1 },
        }),
      },
      {
        at: 0.8,
        pose: mkPose({
          lean: -0.6,
          drop: 20,
          legL: { a1: 1.0, bend: 0.35 },
          legR: { a1: 0.15, bend: 1.7 },
          armL: { a1: -0.6, bend: 0.5 },
          armR: { a1: 0.35, bend: 0.9 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: 0.1,
          drop: 6,
          legL: { a1: 0.5, bend: 0.6 },
          legR: { a1: -0.3, bend: 0.7 },
        }),
      },
    ],
  },
  // Exit Position: a backward phase-dash — heels forward, body thrown back.
  exit: {
    duration: 420,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: -0.35,
          legL: { a1: 0.8, bend: 0.3 },
          legR: { a1: 0.5, bend: 0.9 },
          armL: { a1: -0.9, bend: 0.7 },
          armR: { a1: -0.6, bend: 0.8 },
        }),
      },
      {
        at: 0.45,
        pose: mkPose({
          lean: -0.55,
          drop: 6,
          legL: { a1: 1.0, bend: 0.15 },
          legR: { a1: 0.7, bend: 0.5 },
          armL: { a1: -1.15, bend: 0.5 },
          armR: { a1: -0.85, bend: 0.6 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: 0.12,
          legL: { a1: 0.4, bend: 0.7 },
          legR: { a1: -0.4, bend: 0.9 },
          armL: { a1: -0.3, bend: 0.7 },
          armR: { a1: 0.4, bend: 0.7 },
        }),
      },
    ],
  },
  // Rotate Position: a forward vault — hands lead, legs whip over.
  rotate: {
    duration: 460,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: 0.5,
          legL: { a1: -0.4, bend: 0.6 },
          legR: { a1: 0.3, bend: 0.4 },
          armL: { a1: 1.2, bend: 0.2 },
          armR: { a1: 1.3, bend: 0.15 },
        }),
      },
      {
        at: 0.5,
        pose: mkPose({
          lean: 0.85,
          rot: 0.9,
          headTuck: 0.5,
          drop: -6,
          legL: { a1: 1.5, bend: 1.2 },
          legR: { a1: 1.2, bend: 0.9 },
          armL: { a1: 1.5, bend: 0.1 },
          armR: { a1: 1.55, bend: 0.1 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: 0.16,
          rot: 0,
          legL: { a1: 0.5, bend: 0.6 },
          legR: { a1: -0.35, bend: 0.8 },
          armL: { a1: -0.3, bend: 0.8 },
          armR: { a1: 0.45, bend: 0.8 },
        }),
      },
    ],
  },
  landing: {
    duration: 170,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: 0.3,
          drop: 12,
          legL: { a1: 0.45, bend: 0.9 },
          legR: { a1: -0.25, bend: 1.0 },
          armL: { a1: -0.35, bend: 0.6 },
          armR: { a1: 0.4, bend: 0.6 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: 0.18,
          drop: 2,
          legL: { a1: 0.3, bend: 0.4 },
          legR: { a1: -0.2, bend: 0.5 },
        }),
      },
    ],
  },
  roll: {
    duration: 480,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: 0.6,
          drop: 14,
          headTuck: 0.8,
          legL: { a1: 0.9, bend: 1.8 },
          legR: { a1: 0.7, bend: 1.9 },
          armL: { a1: 1.0, bend: 1.5 },
          armR: { a1: 1.0, bend: 1.5 },
        }),
      },
      {
        at: 0.7,
        pose: mkPose({
          rot: Math.PI * 1.7,
          drop: 18,
          headTuck: 1,
          legL: { a1: 1.1, bend: 2.2 },
          legR: { a1: 0.9, bend: 2.2 },
          armL: { a1: 1.2, bend: 1.8 },
          armR: { a1: 1.2, bend: 1.8 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          rot: Math.PI * 2,
          lean: 0.2,
          legL: { a1: 0.4, bend: 0.5 },
          legR: { a1: -0.3, bend: 0.6 },
        }),
      },
    ],
  },
  trip: {
    duration: 560,
    frames: [
      // toe catches — body pitches forward, arms flail
      {
        at: 0,
        pose: mkPose({
          lean: 0.55,
          legL: { a1: -0.55, bend: 0.2 },
          legR: { a1: 0.5, bend: 0.7 },
          armL: { a1: 1.3, bend: 0.15 },
          armR: { a1: 0.9, bend: 0.2 },
        }),
      },
      {
        at: 0.35,
        pose: mkPose({
          lean: 0.85,
          drop: 10,
          headTuck: 0.3,
          legL: { a1: -0.3, bend: 0.9 },
          legR: { a1: 0.75, bend: 0.4 },
          armL: { a1: 1.5, bend: 0.1 },
          armR: { a1: 1.35, bend: 0.1 },
        }),
      },
      // recovery — plants foot, pushes back upright
      {
        at: 0.7,
        pose: mkPose({
          lean: 0.4,
          drop: 8,
          legL: { a1: 0.55, bend: 0.6 },
          legR: { a1: -0.2, bend: 0.9 },
          armL: { a1: 0.5, bend: 0.7 },
          armR: { a1: -0.3, bend: 0.7 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: 0.18,
          legL: { a1: 0.35, bend: 0.5 },
          legR: { a1: -0.3, bend: 0.7 },
        }),
      },
    ],
  },
  death: {
    duration: 900,
    hold: true,
    frames: [
      {
        at: 0,
        pose: mkPose({
          lean: -0.3,
          legL: { a1: 0.9, bend: 0.4 },
          legR: { a1: 0.4, bend: 1.1 },
          armL: { a1: -1.2, bend: 0.3 },
          armR: { a1: -0.9, bend: 0.4 },
        }),
      },
      // swallowed backward by the wave
      {
        at: 0.5,
        pose: mkPose({
          lean: -0.9,
          rot: -0.8,
          drop: 10,
          headTuck: 0.4,
          legL: { a1: 1.3, bend: 0.8 },
          legR: { a1: 0.9, bend: 1.4 },
          armL: { a1: -1.5, bend: 0.2 },
          armR: { a1: -1.3, bend: 0.3 },
        }),
      },
      {
        at: 1,
        pose: mkPose({
          lean: -1.2,
          rot: -1.7,
          drop: 30,
          headTuck: 0.9,
          legL: { a1: 1.5, bend: 1.6 },
          legR: { a1: 1.2, bend: 1.9 },
          armL: { a1: -1.6, bend: 0.6 },
          armR: { a1: -1.4, bend: 0.7 },
        }),
      },
    ],
  },
} satisfies Record<string, ActionClip>;

export type ClipName = keyof typeof CLIPS;
