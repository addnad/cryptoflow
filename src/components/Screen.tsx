"use client";

import { motion } from "framer-motion";

interface ScreenProps {
  children?: React.ReactNode;
  /** Push direction from the navigation store (1 = deeper, -1 = back). */
  direction?: 1 | -1;
  className?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Full-screen container with a native push/pop transition. Screens slide a
 * subtle 6% with fade so navigation feels physical without being showy.
 */
export function Screen({ children, direction = 1, className = "" }: ScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -24 }}
      transition={{ duration: 0.32, ease: EASE }}
      className={`absolute inset-0 flex flex-col overflow-hidden bg-ink ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** Staggered content reveal used inside screens. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
};
