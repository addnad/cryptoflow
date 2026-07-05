"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useSession } from "@/stores/session";
import { services } from "@/lib/services";
import {
  formatCompact,
  formatDistance,
  formatMoney,
} from "@/lib/utils/format";
import { ACHIEVEMENTS } from "@/features/achievements/definitions";
import { linkGuestToGoogle } from "@/features/auth/sessionController";
import { GuestUpgradeCard } from "./GuestUpgradeCard";
import { levelFromXp } from "./leveling";

export function ProfileScreen({ direction }: { direction: 1 | -1 }) {
  const profile = useSession((s) => s.profile);
  const user = useSession((s) => s.user);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    void services()
      .then((b) => b.achievements.all(profile.uid))
      .then((states) =>
        setUnlockedCount(states.filter((s) => s.unlockedAt).length),
      );
  }, [profile]);

  if (!profile) return <Screen direction={direction} />;
  const lvl = levelFromXp(profile.xp);

  return (
    <Screen direction={direction}>
      <TopBar title="Profile" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-safe pt-4"
      >
        {/* identity */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col items-center gap-3 pt-2"
        >
          <Avatar avatarId={profile.avatarId} size={96} />
          <div className="text-center">
            <h2 className="text-title text-snow">{profile.displayName}</h2>
            <p className="text-body text-fog-dim">@{profile.username}</p>
          </div>
          <div className="w-full max-w-60">
            <div className="mb-1.5 flex justify-between">
              <span className="text-caption text-ember">
                Level {lvl.level}
              </span>
              <span className="tnum text-caption text-fog-dim">
                {Math.round(lvl.intoLevel)}/{lvl.needed} XP
              </span>
            </div>
            <ProgressBar fraction={lvl.fraction} />
          </div>
        </motion.div>

        {user?.isAnonymous && (
          <motion.div variants={staggerItem}>
            <GuestUpgradeCard onLink={linkGuestToGoogle} />
          </motion.div>
        )}

        {/* stats */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2.5">
          <StatCard label="Best score">
            <AnimatedNumber
              value={profile.bestScore}
              format={formatCompact}
              className="text-[22px] font-bold text-snow"
            />
          </StatCard>
          <StatCard label="Best portfolio">
            <AnimatedNumber
              value={profile.bestPortfolio}
              format={formatMoney}
              className="text-[22px] font-bold text-mint"
            />
          </StatCard>
          <StatCard label="Longest combo">
            <span className="tnum text-[22px] font-bold text-ember">
              ×{profile.bestCombo}
            </span>
          </StatCard>
          <StatCard label="Runs">
            <AnimatedNumber
              value={profile.gamesPlayed}
              className="text-[22px] font-bold text-snow"
            />
          </StatCard>
          <StatCard label="Total distance">
            <span className="tnum text-[22px] font-bold text-snow">
              {formatDistance(profile.totalDistanceM)}
            </span>
          </StatCard>
          <StatCard label="Correct reads">
            <AnimatedNumber
              value={profile.totalCorrect}
              format={formatCompact}
              className="text-[22px] font-bold text-snow"
            />
          </StatCard>
        </motion.div>

        {/* achievements + coins summary */}
        <motion.div variants={staggerItem} className="flex gap-2.5">
          <div className="flex-1 rounded-2xl border border-line bg-ink-raised px-5 py-4">
            <p className="text-caption text-fog-dim">Achievements</p>
            <p className="tnum mt-1 text-[18px] font-semibold text-snow">
              {unlockedCount}
              <span className="text-fog-dim"> / {ACHIEVEMENTS.length}</span>
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-line bg-ink-raised px-5 py-4">
            <p className="text-caption text-fog-dim">Coins</p>
            <AnimatedNumber
              value={profile.coins}
              format={formatCompact}
              className="mt-1 block text-[18px] font-semibold text-ember"
            />
          </div>
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="pb-4 text-center text-[12px] text-fog-dim"
        >
          Trading since{" "}
          {new Date(profile.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </motion.p>
      </motion.div>
    </Screen>
  );
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink-raised px-5 py-4">
      <p className="text-caption text-fog-dim">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
