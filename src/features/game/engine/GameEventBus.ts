import type {
  EventResolution,
  HudSnapshot,
  PlayerAction,
  RunStats,
} from "@/types";

/**
 * Typed bridge between the Phaser world and React. Phaser emits gameplay
 * facts; React sends lifecycle commands. Both sides stay ignorant of each
 * other's internals.
 */
export interface GameEvents {
  /** Phaser → React */
  hud: HudSnapshot;
  resolution: EventResolution;
  /** An event gate entered telegraph range — HUD shows the banner. */
  telegraph: {
    title: string;
    description: string;
    glyph: string;
    tintCss: string;
    action: PlayerAction;
    /** Show the verb hint (early difficulty only). */
    hint: boolean;
  };
  environment: { name: string; index: number };
  runOver: RunStats;
  caught: undefined;
  /** React → Phaser */
  start: undefined;
  pause: undefined;
  resume: undefined;
  /** Player gave up from the pause sheet — end the run as a quit. */
  abort: undefined;
}

type Handler<T> = (payload: T) => void;

export class GameEventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(
    event: K,
    handler: Handler<GameEvents[K]>,
  ): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.handlers.get(event)?.forEach((h) => {
      (h as Handler<GameEvents[K]>)(payload);
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}
