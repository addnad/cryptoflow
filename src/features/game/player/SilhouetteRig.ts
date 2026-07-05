import Phaser from "phaser";
import { easeInOutCubic } from "@/lib/utils/math";
import {
  BONES,
  CLIPS,
  idlePose,
  lerpPose,
  mkPose,
  runPose,
  type ClipName,
  type Pose,
} from "./poses";

const BODY_COLOR = 0x04060c;
const LIMB_WIDTH = 5;
const TORSO_WIDTH = 7;
const BLEND_MS = 110;

type RigMode = "idle" | "run" | ClipName;

/**
 * The silhouette trader. A procedural skeleton rendered as rounded strokes
 * into a Graphics object. Locomotion is parametric (cadence follows speed);
 * actions are keyframe clips; every transition cross-fades over ~110 ms so
 * nothing ever snaps.
 */
export class SilhouetteRig {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private halo: Phaser.GameObjects.Image;

  private mode: RigMode = "idle";
  private clipTime = 0;
  private runPhase = 0;
  private idleTime = 0;
  private speedT = 0;

  /** Pose we are blending FROM (snapshot at transition). */
  private blendFrom: Pose | null = null;
  private blendElapsed = 0;
  private current: Pose = mkPose({});

  private onClipEnd: ((clip: ClipName) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Soft light pool that separates the black silhouette from the city.
    if (!scene.textures.exists("player-halo")) {
      const size = 160;
      const canvas = scene.textures.createCanvas("player-halo", size, size);
      if (canvas) {
        const ctx = canvas.getContext();
        const grad = ctx.createRadialGradient(
          size / 2, size / 2, 8,
          size / 2, size / 2, size / 2,
        );
        grad.addColorStop(0, "rgba(142, 150, 172, 0.30)");
        grad.addColorStop(0.55, "rgba(142, 150, 172, 0.10)");
        grad.addColorStop(1, "rgba(142, 150, 172, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        canvas.refresh();
      }
    }
    this.halo = scene.add.image(x, y - 40, "player-halo").setDepth(19);
    this.g = scene.add.graphics();
    this.container = scene.add.container(x, y, [this.g]).setDepth(20);
  }

  setClipEndListener(cb: (clip: ClipName) => void): void {
    this.onClipEnd = cb;
  }

  /** Switch to a keyframe clip with a cross-fade. */
  play(clip: ClipName): void {
    this.beginBlend();
    this.mode = clip;
    this.clipTime = 0;
  }

  /** Return to locomotion (run) blending from wherever we are. */
  toRun(): void {
    if (this.mode === "run") return;
    this.beginBlend();
    this.mode = "run";
  }

  toIdle(): void {
    if (this.mode === "idle") return;
    this.beginBlend();
    this.mode = "idle";
  }

  get activeClip(): ClipName | null {
    return this.mode !== "run" && this.mode !== "idle" ? this.mode : null;
  }

  private beginBlend(): void {
    this.blendFrom = { ...this.current };
    this.blendElapsed = 0;
  }

  /**
   * Advance the animator.
   * @param dt seconds
   * @param speedPxPerSec world speed (drives stride cadence)
   * @param speedT normalised momentum 0..1
   */
  update(dt: number, speedPxPerSec: number, speedT: number): void {
    this.speedT = speedT;
    this.idleTime += dt;
    // Stride length ~150px: cadence accelerates with world speed.
    this.runPhase += ((speedPxPerSec / 150) * Math.PI * 2 * dt) / 2;

    let target: Pose;
    if (this.mode === "run") {
      target = runPose(this.runPhase, speedT);
    } else if (this.mode === "idle") {
      target = idlePose(this.idleTime);
    } else {
      const clip: import("./poses").ActionClip = CLIPS[this.mode];
      this.clipTime += dt * 1000;
      const t = Math.min(1, this.clipTime / clip.duration);
      target = sampleClip(this.mode, t);
      if (this.clipTime >= clip.duration) {
        const ended = this.mode;
        if (clip.hold ?? false) {
          // stay on final frame; controller decides what's next
        } else {
          this.toRun();
        }
        this.onClipEnd?.(ended);
      }
    }

    // Cross-fade from the snapshot taken at the last transition.
    if (this.blendFrom) {
      this.blendElapsed += dt * 1000;
      const bt = Math.min(1, this.blendElapsed / BLEND_MS);
      this.current = lerpPose(this.blendFrom, target, easeInOutCubic(bt));
      if (bt >= 1) this.blendFrom = null;
    } else {
      this.current = target;
    }

    this.draw();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.halo.setPosition(x, y - 34);
  }

  setAlpha(a: number): void {
    this.container.setAlpha(a);
  }

  destroy(): void {
    this.g.destroy();
    this.halo.destroy();
    this.container.destroy();
  }

  /** Render the skeleton for the current pose. */
  private draw(): void {
    const p = this.current;
    const g = this.g;
    g.clear();
    this.container.setRotation(p.rot);

    const hipY = -BONES.HIP_HEIGHT + p.drop;
    const hip = { x: 0, y: hipY };

    // Torso up from the hip.
    const top = {
      x: hip.x + Math.sin(p.lean) * BONES.TORSO,
      y: hip.y - Math.cos(p.lean) * BONES.TORSO,
    };

    // Legs (draw far leg slightly dimmer for depth).
    this.drawLeg(hip, p.legR.a1, p.legR.bend, 0.82);
    this.drawLeg(hip, p.legL.a1, p.legL.bend, 1);

    // Torso.
    this.stroke(hip, top, TORSO_WIDTH, 1);

    // Head — follows lean, tucks toward the chest in flips.
    const headDir = p.lean + p.headTuck * 0.9;
    const headDist = BONES.HEAD_R + 4 - p.headTuck * 3;
    const head = {
      x: top.x + Math.sin(headDir) * headDist,
      y: top.y - Math.cos(headDir) * headDist,
    };
    g.fillStyle(BODY_COLOR, 1);
    g.fillCircle(head.x, head.y, BONES.HEAD_R);

    // Arms from the shoulder point.
    const shoulder = {
      x: hip.x + Math.sin(p.lean) * (BONES.TORSO - 3),
      y: hip.y - Math.cos(p.lean) * (BONES.TORSO - 3),
    };
    this.drawArm(shoulder, p.armR.a1, p.armR.bend, 0.82);
    this.drawArm(shoulder, p.armL.a1, p.armL.bend, 1);
  }

  private drawLeg(
    hip: { x: number; y: number },
    a1: number,
    bend: number,
    alpha: number,
  ): void {
    const knee = {
      x: hip.x + Math.sin(a1) * BONES.THIGH,
      y: hip.y + Math.cos(a1) * BONES.THIGH,
    };
    const shinA = a1 - bend;
    const foot = {
      x: knee.x + Math.sin(shinA) * BONES.SHIN,
      y: knee.y + Math.cos(shinA) * BONES.SHIN,
    };
    this.stroke(hip, knee, LIMB_WIDTH, alpha);
    this.stroke(knee, foot, LIMB_WIDTH - 0.5, alpha);
    // foot nub for a grounded read
    this.g.fillStyle(BODY_COLOR, alpha);
    this.g.fillCircle(
      foot.x + Math.cos(shinA) * 3,
      foot.y - Math.sin(shinA) * 1,
      2.6,
    );
  }

  private drawArm(
    shoulder: { x: number; y: number },
    a1: number,
    bend: number,
    alpha: number,
  ): void {
    const elbow = {
      x: shoulder.x + Math.sin(a1) * BONES.UPPER_ARM,
      y: shoulder.y + Math.cos(a1) * BONES.UPPER_ARM,
    };
    const foreA = a1 + bend;
    const hand = {
      x: elbow.x + Math.sin(foreA) * BONES.FOREARM,
      y: elbow.y + Math.cos(foreA) * BONES.FOREARM,
    };
    this.stroke(shoulder, elbow, LIMB_WIDTH - 0.5, alpha);
    this.stroke(elbow, hand, LIMB_WIDTH - 1, alpha);
  }

  /** Line with faked round caps (WebGL lines have none). */
  private stroke(
    a: { x: number; y: number },
    b: { x: number; y: number },
    width: number,
    alpha: number,
  ): void {
    const g = this.g;
    g.lineStyle(width, BODY_COLOR, alpha);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.strokePath();
    g.fillStyle(BODY_COLOR, alpha);
    g.fillCircle(a.x, a.y, width / 2);
    g.fillCircle(b.x, b.y, width / 2);
  }
}

function sampleClip(name: ClipName, t: number): Pose {
  const clip = CLIPS[name];
  const frames = clip.frames;
  if (t <= frames[0]!.at) return frames[0]!.pose;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]!;
    const b = frames[i + 1]!;
    if (t >= a.at && t <= b.at) {
      const local = (t - a.at) / (b.at - a.at || 1);
      return lerpPose(a.pose, b.pose, easeInOutCubic(local));
    }
  }
  return frames[frames.length - 1]!.pose;
}
