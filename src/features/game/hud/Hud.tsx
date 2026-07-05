"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useRun } from "@/stores/run";
import { formatCompact, formatDistance, formatMoney } from "@/lib/utils/format";
import { haptic } from "@/lib/native";
import type { PlayerAction } from "@/types";

const ACTION_LABEL: Record<PlayerAction, string> = {
  jump: "Swipe up",
  slide: "Swipe down",
  exit: "Swipe left",
  rotate: "Swipe right",
};

interface HudProps {
  onPause: () => void;
}

/**
 * The in-run overlay. Reads throttled snapshots from the run store —
 * momentum bar, portfolio ticker, score/combo, event resolution toasts and
 * the bear-proximity vignette. Pointer events pass through to the canvas
 * everywhere except the pause button.
 */
export function Hud({ onPause }: HudProps) {
  const hud = useRun((s) => s.hud);
  const resolution = useRun((s) => s.resolution);
  const setResolution = useRun((s) => s.setResolution);

  // Auto-clear resolution toasts.
  useEffect(() => {
    if (!resolution) return;
    const t = setTimeout(() => setResolution(null), 1100);
    return () => clearTimeout(t);
  }, [resolution, setResolution]);

  const deltaUp = hud.portfolioDelta >= 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* momentum bar — the single most important reading */}
      <div className="pt-safe px-5">
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-raised/80">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                hud.momentum > 60
                  ? "var(--color-ember)"
                  : hud.momentum > 30
                    ? "var(--color-fog)"
                    : "var(--color-rose)",
            }}
            initial={false}
            animate={{ width: `${hud.momentum}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>

        {/* top row: portfolio | pause */}
        <div className="mt-3 flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber
                value={hud.portfolio}
                format={formatMoney}
                duration={400}
                className="text-[28px] font-bold leading-none text-snow"
              />
              <AnimatePresence>
                {Math.abs(hud.portfolioDelta) > 1 && (
                  <motion.span
                    key={`${deltaUp}-${Math.round(hud.portfolio)}`}
                    initial={{ opacity: 0, y: deltaUp ? 6 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-[13px] font-semibold ${deltaUp ? "text-mint" : "text-rose"}`}
                  >
                    {deltaUp ? "▲" : "▼"} {formatMoney(Math.abs(hud.portfolioDelta))}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="tnum text-[13px] font-medium text-fog">
                {formatCompact(hud.score)} pts
              </span>
              <span className="tnum text-[13px] text-fog-dim">
                {formatDistance(hud.distanceM)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              void haptic("light");
              onPause();
            }}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-raised/80"
            aria-label="Pause"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-snow)">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          </button>
        </div>

        {/* combo + district */}
        <div className="mt-1 flex items-center justify-between">
          <AnimatePresence>
            {hud.combo >= 2 && (
              <motion.span
                key="combo"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="tnum rounded-full bg-ember/15 px-3 py-1 text-[13px] font-bold text-ember"
              >
                ×{hud.combo} combo
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-caption text-fog-dim">
            {hud.environmentName}
          </span>
        </div>
      </div>

      {/* resolution toast */}
      <div className="flex flex-1 items-start justify-center pt-16">
        <AnimatePresence>
          {resolution && (
            <motion.div
              key={`${resolution.eventId}-${resolution.combo}`}
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col items-center rounded-2xl border px-5 py-3 backdrop-blur-sm ${
                resolution.outcome === "mistake"
                  ? "border-rose/50 bg-rose/10"
                  : resolution.outcome === "perfect"
                    ? "border-ember/60 bg-ember/10"
                    : "border-mint/40 bg-mint/10"
              }`}
            >
              <span className="text-[13px] font-semibold text-snow">
                {resolution.title}
              </span>
              {resolution.outcome === "mistake" ? (
                <span className="text-[12px] text-rose">
                  {ACTION_LABEL[resolution.bestAction]} next time
                </span>
              ) : (
                <span
                  className={`tnum text-[12px] font-bold ${resolution.outcome === "perfect" ? "text-ember" : "text-mint"}`}
                >
                  {resolution.outcome === "perfect" ? "PERFECT " : ""}+
                  {formatCompact(resolution.scoreDelta)}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bear proximity vignette */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-40"
        style={{
          background:
            "linear-gradient(90deg, rgba(120,16,26,0.55), rgba(120,16,26,0))",
        }}
        initial={false}
        animate={{ opacity: hud.bearProximity > 0.25 ? hud.bearProximity : 0 }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}
