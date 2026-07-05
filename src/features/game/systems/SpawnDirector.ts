import Phaser from "phaser";
import type { EventOutcome, MarketEventDef, PlayerAction } from "@/types";
import { GAME } from "../engine/config";
import type { DifficultyDirector } from "./DifficultyDirector";
import type { MarketEventEngine } from "../market/MarketEventEngine";

interface Gate {
  def: MarketEventDef;
  worldX: number;
  container: Phaser.GameObjects.Container;
  beacon: Phaser.GameObjects.Arc;
  resolved: boolean;
  telegraphed: boolean;
}

export interface GateResolution {
  def: MarketEventDef;
  outcome: EventOutcome;
  action: PlayerAction | null;
}

/**
 * Streams market-event gates toward the player and adjudicates them.
 *
 * A gate is a telegraphed decision line: beacon glyph + light pillar +
 * an obstacle shape matching its verb (block to jump, beam to slide under,
 * wall to exit through, diamond to rotate past). The first swipe inside the
 * reaction window resolves it; a gate crossing the player unresolved is a
 * mistake. Timing inside the tightest 40% of the window scores "perfect".
 */
export class SpawnDirector {
  private gates: Gate[] = [];
  private nextSpawnX: number;

  constructor(
    private scene: Phaser.Scene,
    private engine: MarketEventEngine,
    private difficulty: DifficultyDirector,
  ) {
    this.nextSpawnX = GAME.WIDTH * 2.2; // breathing room before the first gate
  }

  /** Px the reaction window spans at current speed/difficulty. */
  private windowPx(speed: number): number {
    return (this.difficulty.windowMs / 1000) * speed;
  }

  update(
    playerWorldX: number,
    speed: number,
    onResolve: (r: GateResolution) => void,
    onTelegraph: (def: MarketEventDef) => void,
  ): void {
    // Spawn ahead of the visible edge.
    const spawnEdge = playerWorldX + GAME.WIDTH + 220;
    while (this.nextSpawnX < spawnEdge) {
      this.spawn(this.nextSpawnX);
      this.nextSpawnX += this.difficulty.gateSpacing;
    }

    const windowPx = this.windowPx(speed);

    for (const gate of this.gates) {
      const screenX =
        GAME.PLAYER_SCREEN_X + (gate.worldX - playerWorldX);
      gate.container.setX(screenX);

      // Telegraph when ~1.1s out.
      if (!gate.telegraphed && gate.worldX - playerWorldX < speed * 1.1) {
        gate.telegraphed = true;
        this.pulse(gate);
        onTelegraph(gate.def);
      }

      // Missed: gate line passed behind the player unresolved.
      if (!gate.resolved && gate.worldX < playerWorldX - windowPx * 0.25) {
        gate.resolved = true;
        this.playFail(gate);
        onResolve({ def: gate.def, outcome: "mistake", action: null });
      }
    }

    // Cull off-screen gates.
    this.gates = this.gates.filter((gate) => {
      if (gate.worldX < playerWorldX - GAME.WIDTH * 0.8) {
        gate.container.destroy();
        return false;
      }
      return true;
    });
  }

  /**
   * Player performed a verb. Finds the nearest unresolved gate in window;
   * returns true if the swipe consumed a gate (right or wrong verb).
   */
  handleAction(
    action: PlayerAction,
    playerWorldX: number,
    speed: number,
    onResolve: (r: GateResolution) => void,
  ): boolean {
    const windowPx = this.windowPx(speed);
    let best: Gate | null = null;
    let bestDist = Infinity;
    for (const gate of this.gates) {
      if (gate.resolved) continue;
      const dist = Math.abs(gate.worldX - playerWorldX);
      if (dist <= windowPx && dist < bestDist) {
        best = gate;
        bestDist = dist;
      }
    }
    if (!best) return false;

    best.resolved = true;
    if (action === best.def.bestAction) {
      const outcome: EventOutcome =
        bestDist <= windowPx * 0.4 ? "perfect" : "clean";
      this.playSuccess(best, outcome === "perfect");
      onResolve({ def: best.def, outcome, action });
    } else {
      this.playFail(best);
      onResolve({ def: best.def, outcome: "mistake", action });
    }
    return true;
  }

  reset(): void {
    for (const g of this.gates) g.container.destroy();
    this.gates = [];
    this.nextSpawnX = GAME.WIDTH * 2.2;
  }

  /* ————— visuals ————— */

  private spawn(worldX: number): void {
    const def = this.engine.next();
    const container = this.scene.add.container(GAME.WIDTH + 300, 0);
    container.setDepth(15);

    const groundY = GAME.GROUND_Y;

    // Light pillar rising from the decision line.
    const pillar = this.scene.add.rectangle(0, groundY - 130, 3, 260, def.tint, 0.20);
    // Obstacle silhouette by verb.
    const obstacle = this.makeObstacle(def);
    // Beacon: glyph in a soft ring above the ground.
    const beacon = this.scene.add.circle(0, groundY - 210, 17, def.tint, 0.12);
    beacon.setStrokeStyle(1.5, def.tint, 0.85);
    const glyph = this.scene.add
      .text(0, groundY - 210, def.glyph, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: `#${def.tint.toString(16).padStart(6, "0")}`,
      })
      .setOrigin(0.5);

    container.add([pillar, obstacle, beacon, glyph]);
    this.gates.push({
      def,
      worldX,
      container,
      beacon,
      resolved: false,
      telegraphed: false,
    });
  }

  private makeObstacle(def: MarketEventDef): Phaser.GameObjects.GameObject {
    const g = this.scene.add.graphics();
    const groundY = GAME.GROUND_Y;
    g.fillStyle(0x04060c, 1);
    g.lineStyle(1.5, def.tint, 0.55);

    switch (def.bestAction) {
      case "jump": {
        // low barrier to leap
        g.fillRoundedRect(-26, groundY - 44, 52, 44, 6);
        g.strokeRoundedRect(-26, groundY - 44, 52, 44, 6);
        break;
      }
      case "slide": {
        // overhead beam to slip under
        g.fillRoundedRect(-30, groundY - 148, 60, 96, 6);
        g.strokeRoundedRect(-30, groundY - 148, 60, 96, 6);
        break;
      }
      case "exit": {
        // jagged hazard wall — phase back out of its reach
        g.fillTriangle(-8, groundY, 30, groundY, 30, groundY - 120);
        g.fillRect(8, groundY - 120, 22, 120);
        g.lineBetween(8, groundY - 120, 30, groundY - 120);
        g.lineBetween(8, groundY - 120, 30, groundY);
        break;
      }
      case "rotate": {
        // rotating diamond field — surge through with a vault
        g.fillTriangle(0, groundY - 96, -22, groundY - 52, 22, groundY - 52);
        g.fillTriangle(0, groundY - 8, -22, groundY - 52, 22, groundY - 52);
        g.lineBetween(0, groundY - 96, -22, groundY - 52);
        g.lineBetween(0, groundY - 96, 22, groundY - 52);
        g.lineBetween(0, groundY - 8, -22, groundY - 52);
        g.lineBetween(0, groundY - 8, 22, groundY - 52);
        break;
      }
    }
    return g;
  }

  private pulse(gate: Gate): void {
    this.scene.tweens.add({
      targets: gate.beacon,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 1, to: 0.4 },
      duration: 420,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    });
  }

  private playSuccess(gate: Gate, perfect: boolean): void {
    // Gate dissolves upward in its own colour.
    this.scene.tweens.add({
      targets: gate.container,
      y: -40,
      alpha: 0,
      duration: perfect ? 320 : 420,
      ease: "Cubic.easeOut",
    });
    const burst = this.scene.add
      .particles(gate.container.x, GAME.GROUND_Y - 60, "spark", {
        speed: { min: 60, max: perfect ? 240 : 160 },
        angle: { min: 230, max: 310 },
        lifespan: 500,
        quantity: perfect ? 22 : 12,
        scale: { start: 0.9, end: 0 },
        tint: gate.def.tint,
        emitting: false,
      })
      .setDepth(30);
    burst.explode();
    this.scene.time.delayedCall(700, () => burst.destroy());
  }

  private playFail(gate: Gate): void {
    this.scene.tweens.add({
      targets: gate.container,
      alpha: 0.25,
      duration: 500,
      ease: "Sine.easeOut",
    });
    this.scene.cameras.main.shake(160, 0.006);
  }
}
