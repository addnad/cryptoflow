"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { Button } from "@/components/Button";
import { LogoMark, Wordmark } from "@/components/Logo";
import {
  signInAsGuest,
  signInWithApple,
  signInWithGoogle,
} from "./sessionController";

/**
 * Sign-in screen. Google, Apple and Guest. Apple Sign In satisfies the App
 * Store requirement to offer it alongside other social logins on iOS.
 */
export function AuthScreen() {
  const [busy, setBusy] = useState<"google" | "apple" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    provider: "google" | "apple" | "guest",
    action: () => Promise<void>,
  ) => {
    setBusy(provider);
    setError(null);
    try {
      await action();
    } catch {
      setError("Sign-in didn't go through. Try again.");
      setBusy(null);
    }
  };

  return (
    <Screen>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-between px-7 pb-safe pt-safe"
      >
        <div />
        <motion.div
          variants={staggerItem}
          className="flex flex-col items-center gap-6"
        >
          <LogoMark size={84} />
          <Wordmark />
          <p className="text-body max-w-[260px] text-center text-fog">
            Ride the momentum. React to the market. Stay ahead of the bear.
          </p>
        </motion.div>

        <div className="flex w-full max-w-sm flex-col gap-3 pb-4">
          <motion.div variants={staggerItem}>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={busy !== null}
              onClick={() => void run("google", signInWithGoogle)}
            >
              <span className="flex items-center justify-center gap-3">
                <GoogleGlyph />
                {busy === "google" ? "Connecting…" : "Continue with Google"}
              </span>
            </Button>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Button
              size="lg"
              block
              disabled={busy !== null}
              onClick={() => void run("apple", signInWithApple)}
            >
              <span className="flex items-center justify-center gap-3">
                <AppleGlyph />
                {busy === "apple" ? "Connecting…" : "Continue with Apple"}
              </span>
            </Button>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Button
              variant="ghost"
              size="lg"
              block
              disabled={busy !== null}
              onClick={() => void run("guest", signInAsGuest)}
            >
              {busy === "guest" ? "Entering…" : "Play as Guest"}
            </Button>
          </motion.div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-body text-center text-rose"
            >
              {error}
            </motion.p>
          )}
          <motion.p
            variants={staggerItem}
            className="text-caption pt-2 text-center text-fog-dim"
          >
            Guest progress lives on this device
          </motion.p>
        </div>
      </motion.div>
    </Screen>
  );
}

function AppleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.4 2.03-2.53 2.05-1.1.02-1.46-.65-2.72-.65-1.26 0-1.66.63-2.7.67-1.09.04-1.92-1.1-2.62-2.11-1.42-2.07-2.51-5.85-1.05-8.4.72-1.27 2.02-2.07 3.42-2.09 1.07-.02 2.08.72 2.73.72.65 0 1.88-.89 3.17-.76.54.02 2.06.22 3.03 1.64-.08.05-1.81 1.06-1.79 3.16M14.28 5.4c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.54.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.35z"
        fill="#0b0e17"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.58-4.1H3.07v2.58A10 10 0 0 0 12 22z"
        fill="#0b0e17"
        opacity="0.75"
      />
      <path
        d="M6.42 13.93a6 6 0 0 1 0-3.86V7.5H3.07a10 10 0 0 0 0 9l3.35-2.57z"
        fill="#0b0e17"
        opacity="0.55"
      />
      <path
        d="M12 5.97c1.47 0 2.78.5 3.82 1.5l2.86-2.87A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.93 5.5l3.35 2.57C7.2 7.72 9.4 5.97 12 5.97z"
        fill="#0b0e17"
        opacity="0.9"
      />
    </svg>
  );
}
