"use client";

import { motion } from "framer-motion";
import { useNavigation } from "@/stores/navigation";
import { haptic } from "@/lib/native";

interface TopBarProps {
  title: string;
  /** Optional right-side slot (e.g. an action button). */
  trailing?: React.ReactNode;
}

/** Standard sub-screen header: back chevron, centered title, trailing slot. */
export function TopBar({ title, trailing }: TopBarProps) {
  const back = useNavigation((s) => s.back);
  return (
    <div className="pt-safe relative z-10 flex items-center px-3 pb-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          void haptic("light");
          back();
        }}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-full text-fog"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
      <h1 className="text-title absolute left-1/2 -translate-x-1/2 text-snow">
        {title}
      </h1>
      <div className="ml-auto">{trailing}</div>
    </div>
  );
}
