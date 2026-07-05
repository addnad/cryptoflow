"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useNavigation, type ScreenId } from "@/stores/navigation";
import { useSession } from "@/stores/session";
import { bootSession } from "@/features/auth/sessionController";
import { onHardwareBack, setupStatusBar } from "@/lib/native";
import { SplashScreen } from "@/features/splash/SplashScreen";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { OnboardingScreen } from "@/features/onboarding/OnboardingScreen";
import { HomeScreen } from "@/features/home/HomeScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { LeaderboardScreen } from "@/features/leaderboard/LeaderboardScreen";
import { AchievementsScreen } from "@/features/achievements/AchievementsScreen";
import { RewardsScreen } from "@/features/rewards/RewardsScreen";
import { TutorialScreen } from "@/features/tutorial/TutorialScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { AboutScreen } from "@/features/about/AboutScreen";

/** Phaser is heavy — the game screen loads only when the player starts a run. */
const GameScreen = dynamic(
  () => import("@/features/game/GameScreen").then((m) => m.GameScreen),
  { ssr: false },
);

const MIN_SPLASH_MS = 1900;

/**
 * Root shell: owns the screen state machine, routes the identity funnel,
 * and maps the Android hardware back button to in-app navigation.
 */
export default function AppShell() {
  const { screen, direction, reset, back } = useNavigation();
  const status = useSession((s) => s.status);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    bootSession();
    void setupStatusBar();
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Hardware back: never exits mid-flow; back() is a no-op at the root.
  useEffect(() => onHardwareBack(() => back()), [back]);

  // Identity funnel drives navigation until the player reaches home.
  useEffect(() => {
    if (!splashDone || status === "booting") return;
    const inFunnel = ["splash", "auth", "onboarding"].includes(screen);
    if (status === "signedOut" && screen !== "auth") reset("auth");
    else if (status === "onboarding" && screen !== "onboarding")
      reset("onboarding");
    else if (status === "ready" && inFunnel) reset("home");
  }, [splashDone, status, screen, reset]);

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <ScreenView key={screen} screen={screen} direction={direction} />
    </AnimatePresence>
  );
}

function ScreenView({
  screen,
  direction,
}: {
  screen: ScreenId;
  direction: 1 | -1;
}) {
  switch (screen) {
    case "splash":
      return <SplashScreen />;
    case "auth":
      return <AuthScreen />;
    case "onboarding":
      return <OnboardingScreen />;
    case "home":
      return <HomeScreen />;
    case "game":
      return <GameScreen />;
    case "profile":
      return <ProfileScreen direction={direction} />;
    case "leaderboard":
      return <LeaderboardScreen direction={direction} />;
    case "achievements":
      return <AchievementsScreen direction={direction} />;
    case "rewards":
      return <RewardsScreen direction={direction} />;
    case "tutorial":
      return <TutorialScreen direction={direction} />;
    case "settings":
      return <SettingsScreen direction={direction} />;
    case "about":
      return <AboutScreen direction={direction} />;
  }
}
