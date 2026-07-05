"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { Avatar } from "@/components/Avatar";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ProgressBar } from "@/components/ProgressBar";
import { useNavigation, type ScreenId } from "@/stores/navigation";
import { useSession } from "@/stores/session";
import { signOutUser } from "@/features/auth/sessionController";
import { levelFromXp } from "@/features/profile/leveling";
import { fetchRewardStatus } from "@/features/rewards/dailyRewards";
import { formatCompact } from "@/lib/utils/format";
import { haptic } from "@/lib/native";
import { SkylineCanvas } from "./SkylineCanvas";

interface MenuEntry {
  screen: ScreenId;
  label: string;
  glyph: React.ReactNode;
  badge?: boolean;
}

/**
 * Home. A living skyline breathes behind a minimal menu; the single ember
 * CTA starts the run. Everything else stays quiet until needed.
 */
export function HomeScreen() {
  const go = useNavigation((s) => s.go);
  const profile = useSession((s) => s.profile);
  const [rewardReady, setRewardReady] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void fetchRewardStatus(profile.uid).then((s) =>
      setRewardReady(Boolean(s.claimable)),
    );
  }, [profile]);

  if (!profile) return <Screen />;
  const lvl = levelFromXp(profile.xp);

  const menu: MenuEntry[] = [
    { screen: "profile", label: "Profile", glyph: <ProfileGlyph /> },
    { screen: "leaderboard", label: "Leaderboard", glyph: <BoardGlyph /> },
    { screen: "achievements", label: "Achievements", glyph: <MedalGlyph /> },
    {
      screen: "rewards",
      label: "Daily Rewards",
      glyph: <GiftGlyph />,
      badge: rewardReady,
    },
    { screen: "tutorial", label: "Tutorial", glyph: <PlayBookGlyph /> },
    { screen: "settings", label: "Settings", glyph: <GearGlyph /> },
    { screen: "about", label: "About", glyph: <InfoGlyph /> },
  ];

  return (
    <Screen>
      <SkylineCanvas />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="pt-safe pb-safe relative z-10 flex flex-1 flex-col px-6"
      >
        {/* identity strip */}
        <motion.button
          variants={staggerItem}
          onClick={() => go("profile")}
          className="mt-2 flex items-center gap-3 text-left"
        >
          <Avatar avatarId={profile.avatarId} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-body truncate font-semibold text-snow">
              {profile.displayName}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-caption text-fog-dim">LVL {lvl.level}</span>
              <ProgressBar fraction={lvl.fraction} className="max-w-24" height={4} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-ink-raised/80 px-3 py-1.5">
            <CoinGlyph />
            <AnimatedNumber
              value={profile.coins}
              format={formatCompact}
              className="text-body font-semibold text-snow"
            />
          </div>
        </motion.button>

        {/* hero */}
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <motion.p variants={staggerItem} className="text-caption text-fog-dim">
            Best score
          </motion.p>
          <motion.div variants={staggerItem}>
            <AnimatedNumber
              value={profile.bestScore}
              format={formatCompact}
              className="text-[56px] font-bold leading-none tracking-tight text-snow"
            />
          </motion.div>
          <motion.div variants={staggerItem} className="mt-8 w-full max-w-xs">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                void haptic("medium");
                go("game");
              }}
              className="relative h-16 w-full rounded-2xl bg-ember text-[19px] font-bold tracking-wide text-ink shadow-[0_12px_40px_-10px_rgba(232,163,61,0.6)]"
            >
              START RUN
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-ember"
                animate={{ opacity: [0.6, 0], scale: [1, 1.08] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
              />
            </motion.button>
          </motion.div>
        </div>

        {/* menu */}
        <div className="flex flex-col gap-1 pb-2">
          {menu.map((entry) => (
            <motion.button
              key={entry.screen}
              variants={staggerItem}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                void haptic("light");
                go(entry.screen);
              }}
              className="flex h-[52px] items-center gap-4 rounded-xl px-3 text-left active:bg-surface/60"
            >
              <span className="text-fog">{entry.glyph}</span>
              <span className="text-body flex-1 font-medium text-snow">
                {entry.label}
              </span>
              {entry.badge && (
                <motion.span
                  className="h-2 w-2 rounded-full bg-ember"
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                />
              )}
              <Chevron />
            </motion.button>
          ))}
          <motion.button
            variants={staggerItem}
            onClick={() => void signOutUser()}
            className="mt-1 h-11 rounded-xl text-center"
          >
            <span className="text-body font-medium text-fog-dim">Log out</span>
          </motion.button>
        </div>
      </motion.div>
    </Screen>
  );
}

/* ——— hand-drawn 20px glyph set (stroke 1.8, round caps) ——— */

const G = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const ProfileGlyph = () => (
  <G>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" />
  </G>
);
const BoardGlyph = () => (
  <G>
    <path d="M5 20V10M12 20V4M19 20v-8" />
  </G>
);
const MedalGlyph = () => (
  <G>
    <circle cx="12" cy="10" r="5" />
    <path d="m8.8 14.2-2 6 5.2-2.6 5.2 2.6-2-6" />
  </G>
);
const GiftGlyph = () => (
  <G>
    <rect x="4" y="9" width="16" height="11" rx="2" />
    <path d="M12 9v11M4 13h16M12 9c-4 0-5.5-2-4.5-4s4.5-.5 4.5 4c0-4.5 3.5-6 4.5-4s-.5 4-4.5 4z" />
  </G>
);
const PlayBookGlyph = () => (
  <G>
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H20v14.5H6a2 2 0 0 0-2 2z" />
    <path d="m10.5 8.5 4.5 3-4.5 3z" />
  </G>
);
const GearGlyph = () => (
  <G>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M18 6l-1.7 1.7M7.7 16.3 6 18M18 18l-1.7-1.7M7.7 7.7 6 6" />
  </G>
);
const InfoGlyph = () => (
  <G>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 7.8v.4" />
  </G>
);
const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="m9.5 6 6 6-6 6"
      stroke="var(--color-fog-dim)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CoinGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="var(--color-ember)" opacity="0.9" />
    <circle cx="12" cy="12" r="5.5" fill="none" stroke="#0b0e17" strokeWidth="1.6" />
  </svg>
);
