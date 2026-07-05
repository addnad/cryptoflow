"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { ProgressBar } from "@/components/ProgressBar";
import { useSession } from "@/stores/session";
import { services } from "@/lib/services";
import { formatCompact } from "@/lib/utils/format";
import type { AchievementState } from "@/types";
import { ACHIEVEMENTS } from "./definitions";

export function AchievementsScreen({ direction }: { direction: 1 | -1 }) {
  const profile = useSession((s) => s.profile);
  const [states, setStates] = useState<Map<string, AchievementState>>(
    new Map(),
  );

  useEffect(() => {
    if (!profile) return;
    void services()
      .then((b) => b.achievements.all(profile.uid))
      .then((all) => setStates(new Map(all.map((s) => [s.id, s]))));
  }, [profile]);

  const unlockedCount = ACHIEVEMENTS.filter(
    (a) => states.get(a.id)?.unlockedAt,
  ).length;

  return (
    <Screen direction={direction}>
      <TopBar title="Achievements" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-safe pt-2"
      >
        <motion.p
          variants={staggerItem}
          className="text-caption px-1 pb-1 text-fog-dim"
        >
          {unlockedCount} of {ACHIEVEMENTS.length} unlocked
        </motion.p>

        {ACHIEVEMENTS.map((def) => {
          const state = states.get(def.id);
          const unlocked = Boolean(state?.unlockedAt);
          const progress = state?.progress ?? 0;
          return (
            <motion.div
              key={def.id}
              variants={staggerItem}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
                unlocked
                  ? "border-ember/40 bg-ember/8"
                  : "border-line bg-ink-raised"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[20px] ${
                  unlocked
                    ? "border-ember/50 text-ember"
                    : "border-line-strong text-fog-dim"
                }`}
              >
                {def.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15px] font-semibold ${unlocked ? "text-snow" : "text-fog"}`}
                >
                  {def.title}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-fog-dim">
                  {def.description}
                </p>
                {!unlocked && def.target > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar
                      fraction={progress / def.target}
                      height={4}
                      color="var(--color-fog)"
                      className="max-w-32"
                    />
                    <span className="tnum text-[11px] text-fog-dim">
                      {formatCompact(progress)}/{formatCompact(def.target)}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`tnum shrink-0 text-[12px] font-bold ${unlocked ? "text-ember" : "text-fog-dim"}`}
              >
                {unlocked ? "✓" : `+${def.rewardCoins}`}
              </span>
            </motion.div>
          );
        })}
        <div className="pb-4" />
      </motion.div>
    </Screen>
  );
}
