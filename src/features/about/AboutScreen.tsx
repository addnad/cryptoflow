"use client";

import { motion } from "framer-motion";
import { Screen, staggerContainer, staggerItem } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { LogoMark, Wordmark } from "@/components/Logo";

const APP_VERSION = "1.0.0";

export function AboutScreen({ direction }: { direction: 1 | -1 }) {
  return (
    <Screen direction={direction}>
      <TopBar title="About" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-safe"
      >
        <motion.div variants={staggerItem} className="flex flex-col items-center gap-5">
          <LogoMark size={72} />
          <Wordmark />
          <span className="text-caption text-fog-dim">
            Version {APP_VERSION}
          </span>
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="text-body max-w-[300px] text-center text-fog"
        >
          An endless run through volatile markets. Read the event, make the
          move, keep your momentum — the Bear Market never stops chasing.
        </motion.p>

        <motion.div
          variants={staggerItem}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="text-caption text-fog-dim">Built with</span>
          <span className="text-body text-fog">
            Phaser · React · Firebase · Capacitor
          </span>
        </motion.div>

        <motion.p variants={staggerItem} className="text-caption text-fog-dim">
          Not financial advice. Obviously.
        </motion.p>
      </motion.div>
    </Screen>
  );
}
