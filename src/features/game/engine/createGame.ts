import Phaser from "phaser";
import { GAME } from "./config";
import type { GameEventBus } from "./GameEventBus";
import { RunScene } from "../scenes/RunScene";

/**
 * Boot a Phaser instance bound to a host element and event bus. The design
 * resolution is portrait 480×854; FIT scaling letter-boxes gracefully on
 * every aspect ratio without distorting gameplay distances.
 */
export function createGame(
  parent: HTMLElement,
  bus: GameEventBus,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b0e17",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME.WIDTH,
      height: GAME.HEIGHT,
    },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    scene: [RunScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set("bus", bus);
      },
    },
  });
}
