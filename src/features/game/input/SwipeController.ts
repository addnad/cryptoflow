import type Phaser from "phaser";
import type { PlayerAction } from "@/types";

const SWIPE_MIN_PX = 26;
const SWIPE_MAX_MS = 450;

/**
 * Gesture recognition over Phaser's pointer events, plus arrow keys for
 * desktop testing. A swipe is a fast, dominant-axis drag:
 * up = jump, down = slide, left = exit, right = rotate.
 */
export class SwipeController {
  private startX = 0;
  private startY = 0;
  private startT = 0;
  private tracking = false;

  constructor(
    scene: Phaser.Scene,
    private onAction: (action: PlayerAction) => void,
  ) {
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.tracking = true;
      this.startX = p.x;
      this.startY = p.y;
      this.startT = p.downTime;
    });

    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.tracking) return;
      this.tracking = false;
      const dt = p.upTime - this.startT;
      if (dt > SWIPE_MAX_MS) return;
      this.resolve(p.x - this.startX, p.y - this.startY);
    });

    const kb = scene.input.keyboard;
    if (kb) {
      kb.on("keydown-UP", () => this.onAction("jump"));
      kb.on("keydown-SPACE", () => this.onAction("jump"));
      kb.on("keydown-DOWN", () => this.onAction("slide"));
      kb.on("keydown-LEFT", () => this.onAction("exit"));
      kb.on("keydown-RIGHT", () => this.onAction("rotate"));
    }
  }

  private resolve(dx: number, dy: number): void {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_MIN_PX && ay < SWIPE_MIN_PX) return;
    if (ax > ay) this.onAction(dx > 0 ? "rotate" : "exit");
    else this.onAction(dy > 0 ? "slide" : "jump");
  }
}
