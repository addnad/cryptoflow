"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: number;
  /** Animate the stroke drawing itself (splash). */
  draw?: boolean;
}

/**
 * The CRYPTO FLOW mark: a momentum line that climbs through volatility and
 * resolves into clean flow — half price chart, half runner's stride.
 */
export function LogoMark({ size = 96, draw = false }: LogoProps) {
  const path =
    "M6 54 L18 42 L26 48 L38 30 L46 36 L58 16 C62 10 68 10 72 16 L78 26";
  return (
    <svg
      width={size}
      height={(size * 64) / 84}
      viewBox="0 0 84 64"
      fill="none"
    >
      <motion.path
        d={path}
        stroke="var(--color-ember)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={draw ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.circle
        cx="78"
        cy="26"
        r="4"
        fill="var(--color-snow)"
        initial={draw ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: draw ? 1.0 : 0, duration: 0.35, ease: "backOut" }}
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="text-display tracking-[0.32em] text-snow">CRYPTO</span>
      <span className="text-display -mt-1 tracking-[0.62em] text-fog">
        FLOW
      </span>
    </div>
  );
}
