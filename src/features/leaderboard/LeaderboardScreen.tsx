"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/stores/session";
import { services } from "@/lib/services";
import { formatCompact, formatMoney } from "@/lib/utils/format";
import { haptic } from "@/lib/native";
import type { BoardMetric, BoardScope, LeaderboardEntry } from "@/types";

const SCOPES: { id: BoardScope; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "Weekly" },
  { id: "friends", label: "Rivals" },
];

const METRICS: { id: BoardMetric; label: string }[] = [
  { id: "score", label: "Score" },
  { id: "portfolio", label: "Portfolio" },
  { id: "combo", label: "Combo" },
];

/**
 * Realtime leaderboards. Subscribes to the active scope/metric through the
 * services layer (Firestore onSnapshot in cloud mode). "Rivals" ranks you
 * against your closest competitors until a social graph ships.
 */
export function LeaderboardScreen({ direction }: { direction: 1 | -1 }) {
  const profile = useSession((s) => s.profile);
  const [scope, setScope] = useState<BoardScope>("global");
  const [metric, setMetric] = useState<BoardMetric>("score");
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    let unsub: (() => void) | null = null;
    let cancelled = false;
    void services().then((b) => {
      if (cancelled) return;
      unsub = b.leaderboards.subscribeTop(scope, metric, 50, (rows) =>
        setEntries(rows),
      );
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [scope, metric]);

  const valueOf = (e: LeaderboardEntry): string =>
    metric === "portfolio"
      ? formatMoney(e.portfolio)
      : metric === "combo"
        ? `×${e.combo}`
        : formatCompact(e.score);

  return (
    <Screen direction={direction}>
      <TopBar title="Leaderboard" />
      <div className="flex flex-1 flex-col px-5 pb-safe">
        {/* scope tabs */}
        <div className="flex rounded-2xl border border-line bg-ink-raised p-1">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                void haptic("light");
                setScope(s.id);
              }}
              className="relative flex-1 rounded-xl py-2.5 text-[14px] font-semibold"
            >
              {scope === s.id && (
                <motion.span
                  layoutId="scope-pill"
                  className="absolute inset-0 rounded-xl bg-surface-high"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={`relative ${scope === s.id ? "text-snow" : "text-fog-dim"}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* metric selector */}
        <div className="mt-3 flex justify-center gap-2">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                void haptic("light");
                setMetric(m.id);
              }}
              className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                metric === m.id
                  ? "border-ember/60 bg-ember/10 text-ember"
                  : "border-line text-fog-dim"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* rows */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {entries === null ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-ink-raised"
                  />
                ))}
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-body pt-16 text-center text-fog-dim"
              >
                No traders on this board yet. Set the pace.
              </motion.p>
            ) : (
              <motion.div
                key={`${scope}-${metric}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-2 pb-4"
              >
                {entries.map((e, i) => {
                  const mine = e.uid === profile?.uid;
                  return (
                    <motion.div
                      key={e.uid}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(0.4, i * 0.035) }}
                      className={`flex h-16 items-center gap-3 rounded-2xl border px-4 ${
                        mine
                          ? "border-ember/50 bg-ember/8"
                          : "border-line bg-ink-raised"
                      }`}
                    >
                      <span
                        className={`tnum w-7 text-center text-[15px] font-bold ${
                          i === 0
                            ? "text-ember"
                            : i < 3
                              ? "text-snow"
                              : "text-fog-dim"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Avatar avatarId={e.avatarId} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-snow">
                          {e.displayName}
                          {mine && (
                            <span className="ml-1.5 text-[11px] font-bold text-ember">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] text-fog-dim">
                          @{e.username} · lvl {e.level}
                        </p>
                      </div>
                      <span className="tnum text-[15px] font-bold text-snow">
                        {valueOf(e)}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Screen>
  );
}
