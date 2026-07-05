import Phaser from "phaser";
import { clamp01, damp } from "@/lib/utils/math";
import { GAME } from "../engine/config";

/**
 * The pursuer. An abstract red-black volatility wavefront that lives off
 * the left edge while momentum is healthy, creeps into frame as it drops,
 * and swallows the trader at proximity 1. Proximity moves as a spring
 * toward f(momentum) plus an instant impulse per mistake, so tension builds
 * and releases smoothly instead of snapping.
 */
export class BearMarketSystem {
  private proximity = 0;
  private impulse = 0;
  private g: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(40);
  }

  onMistake(): void {
    this.impulse += GAME.BEAR.MISTAKE_IMPULSE;
  }

  /** 0..1 — how deep into the frame the wave has intruded. */
  get value(): number {
    return this.proximity;
  }

  get hasCaught(): boolean {
    return this.proximity >= 1;
  }

  update(dt: number, momentumT: number): void {
    this.time += dt;
    // Rest target: high momentum pushes the bear out, low invites it in.
    const target = clamp01(Math.pow(1 - momentumT, 1.6) * 0.92 + this.impulse);
    this.impulse = Math.max(0, this.impulse - dt * 0.10);
    this.proximity = damp(this.proximity, target, GAME.BEAR.HALF_LIFE, dt);
    this.draw();
  }

  /** Surge used for the catch cinematic. */
  surge(): void {
    this.impulse = 1.4;
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    if (this.proximity < 0.02) return;

    const intrusion = this.proximity * GAME.BEAR.MAX_INTRUSION;
    const H = GAME.HEIGHT;

    // Layered dark wall with a living, jagged leading edge.
    const layers = [
      { off: 0, color: 0x150507, alpha: 0.97 },
      { off: 26, color: 0x2a080c, alpha: 0.55 },
      { off: 48, color: 0x53101a, alpha: 0.28 },
    ];
    for (const layer of layers) {
      const edge = intrusion - layer.off;
      if (edge <= 0) continue;
      g.fillStyle(layer.color, layer.alpha);
      g.beginPath();
      g.moveTo(-4, 0);
      const segments = 14;
      for (let i = 0; i <= segments; i++) {
        const y = (H / segments) * i;
        const wob =
          Math.sin(this.time * 5 + i * 1.7) * 9 +
          Math.sin(this.time * 11 + i * 3.1) * 5;
        g.lineTo(edge + wob, y);
      }
      g.lineTo(-4, H);
      g.closePath();
      g.fillPath();
    }

    // Red candle-wick streaks inside the wave.
    g.fillStyle(0xe2565c, 0.30 + 0.25 * Math.sin(this.time * 7));
    for (let i = 0; i < 5; i++) {
      const y = ((this.time * 90 + i * H * 0.22) % (H + 60)) - 30;
      const w = intrusion * (0.25 + 0.12 * Math.sin(i * 9 + this.time * 3));
      g.fillRect(0, y, Math.max(0, w), 2.5);
    }
  }

  reset(): void {
    this.proximity = 0;
    this.impulse = 0;
    this.g.clear();
  }
}
