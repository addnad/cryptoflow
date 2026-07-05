import type Phaser from "phaser";
import type { PlayerAction } from "@/types";
import { GAME } from "../engine/config";
import { SilhouetteRig } from "./SilhouetteRig";

export type PlayerState =
  | "idle"
  | "run"
  | "air"
  | "slide"
  | "dash"
  | "trip"
  | "dead";

/**
 * Owns the trader's physical body: vertical physics, slide/dash timers and
 * the mapping from swipe verbs to rig clips. The controller is deliberately
 * ignorant of gates and scoring — RunScene wires outcomes back into it
 * (trip on mistake, death when caught).
 */
export class PlayerController {
  readonly rig: SilhouetteRig;

  private state: PlayerState = "idle";
  private y = 0; // height above ground (positive = up)
  private vy = 0;
  private usedDoubleJump = false;
  private slideMs = 0;
  private dashMs = 0;
  private dashDir: 1 | -1 = 1;
  private fastFall = false;

  constructor(scene: Phaser.Scene) {
    this.rig = new SilhouetteRig(scene, GAME.PLAYER_SCREEN_X, GAME.GROUND_Y);
    this.rig.setClipEndListener((clip) => {
      if (clip === "trip" && this.state === "trip") {
        this.state = "run";
        this.rig.toRun();
      }
    });
  }

  beginRun(): void {
    this.state = "run";
    this.rig.toRun();
  }

  get grounded(): boolean {
    return this.y <= 0.01;
  }

  get sliding(): boolean {
    return this.state === "slide";
  }

  get dead(): boolean {
    return this.state === "dead";
  }

  /** Screen-space x including dash displacement. */
  get screenX(): number {
    if (this.state !== "dash") return GAME.PLAYER_SCREEN_X;
    const t = this.dashMs / GAME.DASH_DURATION_MS;
    const peak =
      this.dashDir === 1 ? GAME.ROTATE_DASH_OFFSET : GAME.EXIT_DASH_OFFSET;
    return GAME.PLAYER_SCREEN_X + Math.sin(Math.PI * t) * peak;
  }

  /** Perform a swipe verb. Returns false if the body can't do it right now. */
  act(action: PlayerAction): boolean {
    if (this.state === "dead" || this.state === "idle") return false;

    switch (action) {
      case "jump":
        if (this.grounded) {
          this.vy = GAME.JUMP_VELOCITY;
          this.state = "air";
          this.usedDoubleJump = false;
          this.fastFall = false;
          this.rig.play("jump");
          return true;
        }
        if (!this.usedDoubleJump) {
          this.vy = GAME.DOUBLE_JUMP_VELOCITY;
          this.usedDoubleJump = true;
          this.rig.play("doubleJump");
          return true;
        }
        return false;

      case "slide":
        if (this.state === "slide") return false;
        if (!this.grounded) {
          // fast-fall into a slide on touchdown
          this.fastFall = true;
          return true;
        }
        this.state = "slide";
        this.slideMs = GAME.SLIDE_DURATION_MS;
        this.rig.play("slide");
        return true;

      case "exit":
        if (this.state === "dash") return false;
        this.state = "dash";
        this.dashDir = -1;
        this.dashMs = 0;
        this.rig.play("exit");
        return true;

      case "rotate":
        if (this.state === "dash") return false;
        this.state = "dash";
        this.dashDir = 1;
        this.dashMs = 0;
        this.rig.play("rotate");
        return true;
    }
  }

  /** Called by the scene when a gate resolves as a mistake. */
  trip(): void {
    if (this.state === "dead") return;
    this.state = "trip";
    this.slideMs = 0;
    this.rig.play("trip");
  }

  /** The bear caught us. */
  die(): void {
    if (this.state === "dead") return;
    this.state = "dead";
    this.rig.play("death");
  }

  update(dt: number, speedPxPerSec: number, momentumT: number): void {
    // Vertical physics: y = height above ground (positive up),
    // vy in px/s with negative = rising. Gravity pulls vy positive.
    if (!this.grounded || this.vy < 0) {
      const gravity = this.fastFall ? GAME.GRAVITY * 2.4 : GAME.GRAVITY;
      this.vy += gravity * dt;
      this.y -= this.vy * dt;
    }
    if (this.y <= 0 && this.vy > 0) {
      const wasAirborne = this.state === "air";
      const impact = this.vy;
      this.y = 0;
      this.vy = 0;
      if (this.state === "dead") {
        // corpse settles
      } else if (wasAirborne) {
        if (this.fastFall) {
          this.fastFall = false;
          this.state = "slide";
          this.slideMs = GAME.SLIDE_DURATION_MS;
          this.rig.play("slide");
        } else if (impact > 1350) {
          // heavy landing → roll through it, momentum preserved
          this.state = "run";
          this.rig.play("roll");
        } else {
          this.state = "run";
          this.rig.play("landing");
        }
      }
    }

    // Slide timer.
    if (this.state === "slide") {
      this.slideMs -= dt * 1000;
      if (this.slideMs <= 0) {
        this.state = "run";
        this.rig.toRun();
      }
    }

    // Dash timer.
    if (this.state === "dash") {
      this.dashMs += dt * 1000;
      if (this.dashMs >= GAME.DASH_DURATION_MS) {
        this.state = "run";
        this.rig.toRun();
      }
    }

    // Ghosting while dashing sells the "phase shift".
    this.rig.setAlpha(this.state === "dash" ? 0.62 : 1);

    this.rig.setPosition(this.screenX, GAME.GROUND_Y - this.y);
    this.rig.update(
      dt,
      this.state === "dead" ? 0 : speedPxPerSec,
      momentumT,
    );
  }

  destroy(): void {
    this.rig.destroy();
  }
}
