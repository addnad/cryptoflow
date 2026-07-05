"use client";

import { motion } from "framer-motion";
import { Screen } from "@/components/Screen";
import { LogoMark, Wordmark } from "@/components/Logo";

/**
 * Boot splash: the mark draws itself, the wordmark rises beneath it.
 * AppShell keeps this on screen until auth resolves (min 1.9 s so the
 * animation always completes).
 */
export function SplashScreen() {
  return (
    <Screen className="items-center justify-center">
      <div className="flex flex-col items-center gap-7">
        <LogoMark size={110} draw />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Wordmark />
        </motion.div>
        <motion.p
          className="text-caption text-fog-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          Outrun the bear
        </motion.p>
      </div>
    </Screen>
  );
}
