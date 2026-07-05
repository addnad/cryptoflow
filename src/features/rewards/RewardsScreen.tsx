"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/Button";
import { useSession } from "@/stores/session";
import { updateProfile } from "@/features/auth/sessionController";
import { haptic } from "@/lib/native";
import type { DailyRewardDef } from "@/types";
import {
  DAILY_REWARDS,
  claimDailyReward,
  fetchRewardStatus,
  type RewardStatus,
} from "./dailyRewards";

/**
 * Daily login streak. Seven escalating chests; missing a day resets the
 * cycle. Claiming grants coins + XP straight onto the profile.
 */
export function RewardsScreen({ direction }: { direction: 1 | -1 }) {
  const profile = useSession((s) => s.profile);
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [claimed, setClaimed] = useState<DailyRewardDef | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void fetchRewardStatus(profile.uid).then(setStatus);
  }, [profile]);

  const claim = async () => {
    if (!profile || !status?.claimable || busy) return;
    setBusy(true);
    const granted = await claimDailyReward(profile.uid);
    if (granted) {
      await updateProfile({
        coins: profile.coins + granted.coins,
        xp: profile.xp + granted.xp,
      });
      setClaimed(granted);
      void haptic("success");
      setStatus(await fetchRewardStatus(profile.uid));
    }
    setBusy(false);
  };

  const activeDay = status?.nextDay ?? 1;

  return (
    <Screen direction={direction}>
      <TopBar title="Daily Rewards" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col px-6 pb-safe"
      >
        <motion.p variants={staggerItem} className="text-body px-1 pt-2 text-fog">
          Show up every day. The streak compounds — just like conviction.
        </motion.p>

        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {DAILY_REWARDS.map((r) => {
            const isNext = r.day === activeDay && Boolean(status?.claimable);
            const isPast =
              r.day < activeDay ||
              (r.day === activeDay && !status?.claimable);
            return (
              <motion.div
                key={r.day}
                variants={staggerItem}
                className={`relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 ${
                  isNext
                    ? "border-ember bg-ember/10"
                    : isPast
                      ? "border-line bg-ink-raised opacity-55"
                      : "border-line bg-ink-raised"
                } ${r.day === 7 ? "col-span-2" : ""}`}
              >
                <span className="text-caption text-fog-dim">Day {r.day}</span>
                <span
                  className={`tnum text-[16px] font-bold ${isNext ? "text-ember" : "text-snow"}`}
                >
                  {r.coins}
                </span>
                <span className="text-[10.5px] uppercase tracking-wider text-fog-dim">
                  coins · {r.xp} xp
                </span>
                {isPast && (
                  <span className="absolute right-2 top-2 text-[11px] text-mint">
                    ✓
                  </span>
                )}
                {isNext && (
                  <motion.span
                    className="absolute inset-0 rounded-2xl border-2 border-ember"
                    animate={{ opacity: [0.7, 0.15, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div variants={staggerItem} className="mt-3 px-1">
          <p className="text-caption text-fog-dim">
            Current streak:{" "}
            <span className="text-ember">
              {status?.state.streak ?? 0} day
              {(status?.state.streak ?? 0) === 1 ? "" : "s"}
            </span>
          </p>
        </motion.div>

        <div className="flex-1" />

        <motion.div variants={staggerItem} className="pb-4">
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!status?.claimable || busy}
            onClick={() => void claim()}
          >
            {status?.claimable
              ? busy
                ? "Claiming…"
                : `Claim Day ${activeDay} — ${status.claimable.label}`
              : "Come back tomorrow"}
          </Button>
        </motion.div>
      </motion.div>

      {/* claim celebration */}
      <AnimatePresence>
        {claimed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setClaimed(null)}
            className="absolute inset-0 z-40 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.6, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="flex flex-col items-center gap-3 rounded-3xl border border-ember/40 bg-ink-raised px-10 py-8"
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[44px]"
              >
                🎁
              </motion.span>
              <p className="text-title text-snow">{claimed.label}</p>
              <div className="flex gap-4">
                <span className="tnum text-[15px] font-bold text-ember">
                  +{claimed.coins} coins
                </span>
                <span className="tnum text-[15px] font-bold text-ember">
                  +{claimed.xp} XP
                </span>
              </div>
              <p className="text-caption mt-2 text-fog-dim">Tap to close</p>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </Screen>
  );
}
