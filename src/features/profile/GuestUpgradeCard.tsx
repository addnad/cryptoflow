"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { haptic } from "@/lib/native";
import type { SocialProvider } from "@/types";

interface GuestUpgradeCardProps {
  onLink: (provider: SocialProvider) => Promise<void>;
}

/**
 * Shown on the profile only while the account is a guest. Links the guest to
 * a Google or Apple account in place — progress is preserved because the uid
 * never changes. Surfaces the "already in use" collision so the player
 * understands why the upgrade was refused.
 */
export function GuestUpgradeCard({ onLink }: GuestUpgradeCardProps) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const link = async (provider: SocialProvider) => {
    setBusy(provider);
    setMessage(null);
    try {
      await onLink(provider);
      void haptic("success");
      // On success the account is no longer anonymous, so this card unmounts.
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setMessage(
        code === "credential-in-use"
          ? "That account is already linked to another trader."
          : code === "signin-cancelled"
            ? "Sign-in was cancelled."
            : "Couldn't link right now. Try again.",
      );
      setBusy(null);
      void haptic("error");
    }
  };

  return (
    <div className="rounded-2xl border border-ember/30 bg-ember/8 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ember/40 text-ember">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3a5 5 0 0 1 5 5v2h1.2A1.8 1.8 0 0 1 20 11.8v6.4A1.8 1.8 0 0 1 18.2 20H5.8A1.8 1.8 0 0 1 4 18.2v-6.4A1.8 1.8 0 0 1 5.8 10H7V8a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v2h6V8a3 3 0 0 0-3-3Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-snow">
            You&apos;re playing as a guest
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-fog">
            Link an account to save your progress and play across devices.
            Your level, coins and unlocks come with you.
          </p>

          <AnimatePresence>
            {message && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-[12px] text-rose"
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-3 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy !== null}
              onClick={() => {
                void haptic("light");
                void link("google");
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ember px-4 text-[14px] font-semibold text-ink disabled:opacity-50"
            >
              <GoogleGlyph />
              {busy === "google" ? "Linking…" : "Link Google account"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy !== null}
              onClick={() => {
                void haptic("light");
                void link("apple");
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-high px-4 text-[14px] font-semibold text-snow disabled:opacity-50"
            >
              <AppleGlyph />
              {busy === "apple" ? "Linking…" : "Link Apple account"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.4 2.03-2.53 2.05-1.1.02-1.46-.65-2.72-.65-1.26 0-1.66.63-2.7.67-1.09.04-1.92-1.1-2.62-2.11-1.42-2.07-2.51-5.85-1.05-8.4.72-1.27 2.02-2.07 3.42-2.09 1.07-.02 2.08.72 2.73.72.65 0 1.88-.89 3.17-.76.54.02 2.06.22 3.03 1.64-.08.05-1.81 1.06-1.79 3.16M14.28 5.4c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.54.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
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
