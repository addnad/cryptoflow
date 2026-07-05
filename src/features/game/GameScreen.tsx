"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type Phaser from "phaser";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useNavigation } from "@/stores/navigation";
import { useRun } from "@/stores/run";
import { onAppStateChange } from "@/lib/native";
import { applyRunResults, type RunOutcome } from "@/features/profile/progression";
import { formatCompact, formatDistance, formatMoney } from "@/lib/utils/format";
import type { RunStats } from "@/types";
import { GameEventBus } from "./engine/GameEventBus";
import { Hud } from "./hud/Hud";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Hosts the Phaser run. Owns the game lifecycle (mount/destroy/retry via
 * remount key), bridges bus events into the run store, and layers the HUD,
 * ready/pause/game-over overlays above the canvas.
 */
export function GameScreen() {
  const [gameKey, setGameKey] = useState(0);
  return <GameInstance key={gameKey} onRetry={() => setGameKey((k) => k + 1)} />;
}

function GameInstance({ onRetry }: { onRetry: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const busRef = useRef<GameEventBus | null>(null);
  if (!busRef.current) busRef.current = new GameEventBus();
  const bus = busRef.current;

  const reset = useNavigation((s) => s.reset);
  const { phase, setPhase, setHud, setResolution, finishRun, resetRun } =
    useRun();
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    resetRun();
    let game: Phaser.Game | null = null;
    let disposed = false;

    const unsubs = [
      bus.on("hud", (hud) => useRun.getState().setHud(hud)),
      bus.on("resolution", (r) => useRun.getState().setResolution(r)),
      bus.on("runOver", (stats: RunStats) => {
        useRun.getState().finishRun(stats);
        void applyRunResults(stats).then(setOutcome);
      }),
    ];

    void import("./engine/createGame").then(({ createGame }) => {
      if (disposed || !hostRef.current) return;
      game = createGame(hostRef.current, bus);
      setBooted(true);
    });

    return () => {
      disposed = true;
      unsubs.forEach((u) => u());
      bus.clear();
      game?.destroy(true);
      useRun.getState().resetRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus]);

  // Pause an active run when the app is backgrounded (or the tab hidden) so
  // the trader isn't caught by the bear while the player is away.
  useEffect(
    () =>
      onAppStateChange((isActive) => {
        if (!isActive && useRun.getState().phase === "running") {
          bus.emit("pause", undefined);
          useRun.getState().setPhase("paused");
        }
      }),
    [bus],
  );

  const start = () => {
    bus.emit("start", undefined);
    setPhase("running");
  };
  const pause = () => {
    bus.emit("pause", undefined);
    setPhase("paused");
  };
  const resume = () => {
    bus.emit("resume", undefined);
    setPhase("running");
  };
  const giveUp = () => {
    bus.emit("resume", undefined);
    bus.emit("abort", undefined);
  };
  const exitToHome = () => reset("home");

  const lastRun = useRun((s) => s.lastRun);

  return (
    <Screen className="bg-ink">
      <div ref={hostRef} className="absolute inset-0" />

      {phase === "running" && <Hud onPause={pause} />}

      <AnimatePresence>
        {phase === "ready" && booted && (
          <ReadyOverlay key="ready" onStart={start} />
        )}
        {phase === "paused" && (
          <PauseSheet
            key="pause"
            onResume={resume}
            onGiveUp={giveUp}
            onQuit={exitToHome}
          />
        )}
        {phase === "over" && lastRun && (
          <GameOverPanel
            key="over"
            stats={lastRun}
            outcome={outcome}
            onRetry={onRetry}
            onHome={exitToHome}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}

/* ————— overlays ————— */

function ReadyOverlay({ onStart }: { onStart: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStart}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink/45"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="flex flex-col items-center gap-4"
      >
        <span className="text-display text-snow">Ready</span>
        <span className="text-body text-fog">
          Tap to enter the market
        </span>
      </motion.div>
      <div className="absolute bottom-16 flex flex-col items-center gap-1.5">
        <span className="text-caption text-fog-dim">Swipe to react</span>
        <span className="text-[13px] text-fog-dim">
          ↑ jump · ↓ slide · ← exit · → rotate
        </span>
      </div>
    </motion.button>
  );
}

function PauseSheet({
  onResume,
  onGiveUp,
  onQuit,
}: {
  onResume: () => void;
  onGiveUp: () => void;
  onQuit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-ink/75 backdrop-blur-[3px]"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="flex w-72 flex-col gap-3"
      >
        <h2 className="text-display pb-3 text-center text-snow">Paused</h2>
        <Button variant="primary" size="lg" block onClick={onResume}>
          Resume
        </Button>
        <Button size="lg" block onClick={onGiveUp}>
          End run
        </Button>
        <Button variant="ghost" block onClick={onQuit}>
          Quit without saving
        </Button>
      </motion.div>
    </motion.div>
  );
}

function GameOverPanel({
  stats,
  outcome,
  onRetry,
  onHome,
}: {
  stats: RunStats;
  outcome: RunOutcome | null;
  onRetry: () => void;
  onHome: () => void;
}) {
  const gain = stats.portfolioFinal - 10_000;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-ink via-ink/85 to-ink/30"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        className="pb-safe px-6"
      >
        <p className="text-caption text-rose">
          {stats.endedBy === "bear" ? "The bear caught you" : "Run ended"}
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <AnimatedNumber
            value={stats.score}
            format={formatCompact}
            duration={900}
            className="text-[52px] font-bold leading-none text-snow"
          />
          {outcome?.isBestScore && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 400, damping: 18 }}
              className="rounded-full bg-ember/15 px-2.5 py-1 text-[12px] font-bold text-ember"
            >
              NEW BEST
            </motion.span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Stat label="Distance" value={formatDistance(stats.distanceM)} />
          <Stat label="Best combo" value={`×${stats.bestCombo}`} />
          <Stat
            label="Portfolio"
            value={formatMoney(stats.portfolioFinal)}
            tone={gain >= 0 ? "up" : "down"}
          />
          <Stat
            label="Reads"
            value={`${stats.correct} · ${stats.mistakes} missed`}
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="tnum text-[13px] font-semibold text-ember">
            +{stats.xpEarned} XP
          </span>
          <span className="tnum text-[13px] font-semibold text-ember">
            +{stats.coinsEarned} coins
          </span>
          {outcome?.leveledUpTo && (
            <span className="text-[13px] font-bold text-mint">
              Level {outcome.leveledUpTo}!
            </span>
          )}
        </div>

        {outcome && outcome.newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-4 flex flex-col gap-2"
          >
            {outcome.newAchievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-ember/30 bg-ember/8 px-4 py-2.5"
              >
                <span className="text-[18px] text-ember">{a.glyph}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-snow">
                    {a.title}
                  </p>
                  <p className="text-[12px] text-fog">{a.description}</p>
                </div>
                <span className="tnum text-[12px] font-bold text-ember">
                  +{a.rewardCoins}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        <div className="mt-6 flex gap-3 pb-2">
          <Button size="lg" onClick={onHome}>
            Home
          </Button>
          <Button variant="primary" size="lg" block onClick={onRetry}>
            Run it back
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-raised/90 px-4 py-3">
      <p className="text-caption text-fog-dim">{label}</p>
      <p
        className={`tnum mt-0.5 text-[17px] font-semibold ${
          tone === "up"
            ? "text-mint"
            : tone === "down"
              ? "text-rose"
              : "text-snow"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
