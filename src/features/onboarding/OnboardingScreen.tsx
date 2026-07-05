"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { validateUsername } from "@/lib/utils/format";
import { haptic } from "@/lib/native";
import { AVATARS } from "./avatars";
import {
  completeOnboarding,
  isUsernameAvailable,
} from "@/features/auth/sessionController";

type Step = 0 | 1 | 2;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * First-login flow: claim a unique handle, pick a display name, choose an
 * avatar. Each step slides in like a native wizard; the username check is
 * debounced against the backend.
 */
export function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0]!.id);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debounced availability check.
  useEffect(() => {
    const value = username.toLowerCase();
    const formatError = value ? validateUsername(value) : null;
    setUsernameError(formatError);
    setAvailable(false);
    if (!value || formatError) return;
    setChecking(true);
    const t = setTimeout(() => {
      void isUsernameAvailable(value)
        .then((ok) => {
          setAvailable(ok);
          setUsernameError(ok ? null : "That handle is taken.");
        })
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const finish = async () => {
    setSubmitting(true);
    try {
      await completeOnboarding({
        username,
        displayName: displayName || username,
        avatarId,
      });
      void haptic("success");
    } catch {
      setSubmitting(false);
      setStep(0);
      setUsernameError("That handle just got taken. Pick another.");
    }
  };

  const steps: {
    title: string;
    subtitle: string;
    canContinue: boolean;
    body: React.ReactNode;
  }[] = [
    {
      title: "Claim your handle",
      subtitle: "Unique across every market. Lowercase, 3–16 characters.",
      canContinue: available && !checking,
      body: (
        <div className="flex flex-col gap-2">
          <div className="flex h-14 items-center rounded-2xl border border-line bg-surface px-5 focus-within:border-ember">
            <span className="pr-1 text-fog">@</span>
            <input
              autoFocus
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().slice(0, 16))
              }
              placeholder="flowrunner"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="text-body w-full bg-transparent text-snow outline-none placeholder:text-fog-dim"
            />
            {checking && <Spinner />}
            {!checking && available && <CheckGlyph />}
          </div>
          <p
            className={`text-body min-h-5 px-1 ${usernameError ? "text-rose" : "text-fog-dim"}`}
          >
            {usernameError ?? (available ? "Available." : "")}
          </p>
        </div>
      ),
    },
    {
      title: "Your display name",
      subtitle: "How other traders see you on leaderboards.",
      canContinue: true,
      body: (
        <div className="flex h-14 items-center rounded-2xl border border-line bg-surface px-5 focus-within:border-ember">
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 24))}
            placeholder={username || "Flow Runner"}
            className="text-body w-full bg-transparent text-snow outline-none placeholder:text-fog-dim"
          />
        </div>
      ),
    },
    {
      title: "Choose your trader",
      subtitle: "Every silhouette runs the same. Style is everything.",
      canContinue: true,
      body: (
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((a) => (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                void haptic("light");
                setAvatarId(a.id);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors duration-200 ${
                avatarId === a.id
                  ? "border-ember bg-surface-high"
                  : "border-line bg-surface"
              }`}
            >
              <Avatar avatarId={a.id} size={64} />
              <span className="text-body font-medium text-snow">{a.name}</span>
              <span className="text-[11px] leading-tight text-fog-dim">
                {a.bio}
              </span>
            </motion.button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step]!;

  return (
    <Screen>
      <div className="pt-safe pb-safe flex flex-1 flex-col px-7">
        {/* progress dots */}
        <div className="flex justify-center gap-2 py-5">
          {steps.map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 rounded-full"
              initial={false}
              animate={{
                width: i === step ? 24 : 8,
                backgroundColor:
                  i <= step ? "var(--color-ember)" : "var(--color-line)",
              }}
              transition={{ duration: 0.35, ease: EASE }}
            />
          ))}
        </div>

        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="absolute inset-0 flex flex-col gap-6 pt-6"
            >
              <div>
                <h2 className="text-display text-snow">{current.title}</h2>
                <p className="text-body mt-2 text-fog">{current.subtitle}</p>
              </div>
              {current.body}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-3 pb-3">
          {step > 0 && (
            <Button
              size="lg"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={submitting}
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!current.canContinue || submitting}
            onClick={() => {
              if (step < 2) setStep((s) => (s + 1) as Step);
              else void finish();
            }}
          >
            {step < 2 ? "Continue" : submitting ? "Entering…" : "Enter the market"}
          </Button>
        </div>
      </div>
    </Screen>
  );
}

function Spinner() {
  return (
    <motion.span
      className="h-4 w-4 rounded-full border-2 border-line-strong border-t-ember"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    />
  );
}

function CheckGlyph() {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
    >
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="var(--color-mint)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
