import Phaser from "phaser";
import type { EventResolution, PlayerAction, RunStats } from "@/types";
import { mulberry32, newRunSeed } from "@/lib/utils/rng";
import { damp } from "@/lib/utils/math";
import { haptic } from "@/lib/native";
import { GAME } from "../engine/config";
import type { GameEventBus } from "../engine/GameEventBus";
import { SwipeController } from "../input/SwipeController";
import { MomentumSystem } from "../systems/MomentumSystem";
import { ScoringSystem } from "../systems/ScoringSystem";
import { PortfolioSystem } from "../systems/PortfolioSystem";
import { DifficultyDirector } from "../systems/DifficultyDirector";
import { SpawnDirector, type GateResolution } from "../systems/SpawnDirector";
import { BearMarketSystem } from "../systems/BearMarketSystem";
import { MarketEventEngine } from "../market/MarketEventEngine";
import { PlayerController } from "../player/PlayerController";
import { CityPainter } from "../world/CityPainter";
import { SoundDirector } from "../audio/SoundDirector";
import { environmentAt } from "../world/environments";

type Phase = "ready" | "running" | "dying" | "over";

/**
 * The run. This scene is a composition root: it owns no game rules itself,
 * it wires systems together and forwards facts across the GameEventBus.
 */
export class RunScene extends Phaser.Scene {
  private bus!: GameEventBus;
  private seed = 0;

  private momentum!: MomentumSystem;
  private scoring!: ScoringSystem;
  private portfolio!: PortfolioSystem;
  private difficulty!: DifficultyDirector;
  private spawner!: SpawnDirector;
  private bear!: BearMarketSystem;
  private player!: PlayerController;
  private city!: CityPainter;
  private audioDir!: SoundDirector;

  private phase: Phase = "ready";
  private worldX = 0;
  private displaySpeed = 0;
  private startedAt = 0;
  private hudAccumMs = 0;
  private envIndex = 0;
  private dyingMs = 0;
  private unsubs: (() => void)[] = [];

  constructor() {
    super("run");
  }

  create(): void {
    this.bus = this.registry.get("bus") as GameEventBus;
    this.seed = newRunSeed();

    // 4px round spark used by every particle burst.
    if (!this.textures.exists("spark")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("spark", 8, 8);
      g.destroy();
    }

    this.city = new CityPainter(this);
    this.momentum = new MomentumSystem();
    this.scoring = new ScoringSystem();
    this.portfolio = new PortfolioSystem();
    this.difficulty = new DifficultyDirector();
    const engine = new MarketEventEngine(
      mulberry32(this.seed),
      this.difficulty,
    );
    this.spawner = new SpawnDirector(this, engine, this.difficulty);
    this.bear = new BearMarketSystem(this);
    this.player = new PlayerController(this);
    this.audioDir = new SoundDirector();
    new SwipeController(this, (a) => this.onAction(a));

    this.unsubs.push(
      this.bus.on("start", () => this.beginRun()),
      this.bus.on("pause", () => this.pauseRun()),
      this.bus.on("resume", () => this.resumeRun()),
      this.bus.on("abort", () => this.finishRun("quit")),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.audioDir.destroy();
      this.player.destroy();
    });

    this.bus.emit("environment", { name: environmentAt(0).name, index: 0 });
  }

  private beginRun(): void {
    if (this.phase !== "ready") return;
    this.phase = "running";
    this.startedAt = this.time.now;
    this.player.beginRun();
    // The start tap is a user gesture — safe point to unlock audio.
    this.audioDir.init();
    this.audioDir.startMusic();
  }

  private pauseRun(): void {
    if (this.phase !== "running") return;
    this.audioDir.setIntensity(0);
    this.scene.pause();
  }

  private resumeRun(): void {
    this.scene.resume();
  }

  private onAction(action: PlayerAction): void {
    if (this.phase !== "running") return;
    const performed = this.player.act(action);
    if (!performed) return;

    switch (action) {
      case "jump":
        this.player.grounded ? this.audioDir.jump() : this.audioDir.doubleJump();
        break;
      case "slide":
        this.audioDir.slide();
        break;
      default:
        this.audioDir.dash();
    }

    const consumed = this.spawner.handleAction(
      action,
      this.worldX,
      this.momentum.speed,
      (r) => this.onResolve(r),
    );
    if (!consumed) {
      // Swinging at nothing costs a little flow — reads must be deliberate.
      this.momentum.add(-GAME.MOMENTUM.WASTED_MOVE);
    }
  }

  private onResolve(r: GateResolution): void {
    const { def, outcome, action } = r;
    let scoreDelta = 0;
    let portfolioDelta = 0;

    if (outcome === "mistake") {
      scoreDelta = this.scoring.resolve(def, outcome, this.momentum.value);
      this.momentum.add(-def.momentumPenalty);
      portfolioDelta = this.portfolio.applyMove(-def.portfolioPenalty);
      this.bear.onMistake();
      this.player.trip();
      this.audioDir.mistake();
      void haptic("error");
    } else {
      scoreDelta = this.scoring.resolve(def, outcome, this.momentum.value);
      const bonus =
        outcome === "perfect" ? GAME.MOMENTUM.PERFECT_BONUS : 0;
      this.momentum.add(def.momentumReward + bonus);
      portfolioDelta = this.portfolio.applyMove(def.portfolioReward);
      this.audioDir.success(outcome === "perfect");
      if (this.scoring.combo > 0 && this.scoring.combo % 10 === 0) {
        this.audioDir.comboMilestone();
      }
      void haptic("light");
    }

    const resolution: EventResolution = {
      eventId: def.id,
      title: def.title,
      outcome,
      action,
      bestAction: def.bestAction,
      scoreDelta,
      portfolioDelta,
      combo: this.scoring.combo,
    };
    this.bus.emit("resolution", resolution);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);

    if (this.phase === "ready") {
      this.player.update(dt, 0, 0.5);
      this.city.update(this.worldX);
      return;
    }

    if (this.phase === "dying") {
      this.dyingMs += deltaMs;
      this.displaySpeed = damp(this.displaySpeed, 0, 0.5, dt);
      this.worldX += this.displaySpeed * dt;
      this.bear.update(dt, 0);
      this.player.update(dt, 0, 0);
      this.city.update(this.worldX);
      if (this.dyingMs >= 1500 && this.phase === "dying") {
        this.finishRun("bear");
      }
      return;
    }

    if (this.phase !== "running") return;

    // — core loop —
    this.momentum.update(dt);
    const speed = this.momentum.speed;
    this.displaySpeed = speed;
    this.worldX += speed * dt;
    const distanceM = this.worldX / GAME.PX_PER_METER;

    this.difficulty.update(distanceM);
    this.scoring.addDistance((speed * dt) / GAME.PX_PER_METER);
    this.portfolio.update(dt, this.momentum.t);

    // District rotation.
    const envIndex = Math.floor(distanceM / GAME.ENVIRONMENT_LENGTH_M);
    if (envIndex !== this.envIndex) {
      this.envIndex = envIndex;
      this.city.setTheme(envIndex);
      this.bus.emit("environment", {
        name: environmentAt(envIndex).name,
        index: envIndex,
      });
    }

    this.spawner.update(
      this.worldX,
      speed,
      (r) => this.onResolve(r),
      (def) =>
        this.bus.emit("telegraph", {
          title: def.title,
          description: def.description,
          glyph: def.glyph,
          tintCss: `#${def.tint.toString(16).padStart(6, "0")}`,
          action: def.bestAction,
          hint: this.difficulty.t < 0.35,
        }),
    );

    this.bear.update(dt, this.momentum.t);
    this.audioDir.setIntensity(this.momentum.t);
    this.audioDir.setBearProximity(this.bear.value);

    if (this.bear.hasCaught) {
      this.startCatch();
      return;
    }

    this.player.update(dt, speed, this.momentum.t);
    this.city.update(this.worldX);

    // Throttled HUD snapshot.
    this.hudAccumMs += deltaMs;
    if (this.hudAccumMs >= GAME.HUD_THROTTLE_MS) {
      this.hudAccumMs = 0;
      this.bus.emit("hud", {
        score: this.scoring.score,
        distanceM,
        combo: this.scoring.combo,
        momentum: this.momentum.value,
        portfolio: this.portfolio.value,
        portfolioDelta: this.portfolio.delta,
        bearProximity: this.bear.value,
        environmentName: environmentAt(this.envIndex).name,
      });
    }
  }

  private startCatch(): void {
    this.phase = "dying";
    this.dyingMs = 0;
    this.player.die();
    this.bear.surge();
    this.audioDir.caught();
    this.audioDir.setIntensity(0);
    this.cameras.main.shake(500, 0.012);
    this.cameras.main.zoomTo(1.12, 900, "Sine.easeInOut");
    void haptic("heavy");
    this.bus.emit("caught", undefined);
  }

  private finishRun(endedBy: RunStats["endedBy"]): void {
    if (this.phase === "over") return;
    this.phase = "over";
    const distanceM = this.worldX / GAME.PX_PER_METER;
    const stats: RunStats = {
      score: this.scoring.score,
      distanceM: Math.floor(distanceM),
      bestCombo: this.scoring.bestCombo,
      correct: this.scoring.correct,
      mistakes: this.scoring.mistakes,
      portfolioPeak: Math.round(this.portfolio.peak),
      portfolioFinal: Math.round(this.portfolio.value),
      durationMs: Math.max(0, this.time.now - this.startedAt),
      seed: this.seed,
      environmentsVisited: this.envIndex + 1,
      endedBy,
      xpEarned: Math.round(
        distanceM * GAME.XP.PER_METER +
          this.scoring.correct * GAME.XP.PER_CORRECT +
          this.scoring.bestCombo * GAME.XP.PER_COMBO_BEST,
      ),
      coinsEarned: Math.round(
        this.scoring.score / 500 / GAME.COINS.PER_500_SCORE +
          this.scoring.correct * GAME.COINS.PER_CORRECT,
      ),
    };
    this.bus.emit("runOver", stats);
  }
}
