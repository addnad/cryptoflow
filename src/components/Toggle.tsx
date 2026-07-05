"use client";

import { motion } from "framer-motion";
import { haptic } from "@/lib/native";

interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
}

/** iOS-quality switch with a sprung thumb. */
export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        void haptic("light");
        onChange(!on);
      }}
      className={`relative h-8 w-[52px] rounded-full transition-colors duration-300 ${
        on ? "bg-ember" : "bg-line-strong"
      }`}
    >
      <motion.span
        className="absolute top-1 h-6 w-6 rounded-full bg-snow shadow-md"
        initial={false}
        animate={{ left: on ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
