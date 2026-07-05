"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
  color?: string;
  height?: number;
  className?: string;
}

/** Slim eased progress bar (XP, achievement progress, momentum previews). */
export function ProgressBar({
  fraction,
  color = "var(--color-ember)",
  height = 6,
  className = "",
}: ProgressBarProps) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-line ${className}`}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
