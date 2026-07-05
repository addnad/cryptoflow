"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { haptic } from "@/lib/native";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: "md" | "lg";
  block?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-ember text-ink font-semibold shadow-[0_6px_24px_-8px_rgba(232,163,61,0.55)]",
  secondary:
    "bg-surface-high text-snow border border-line-strong font-medium",
  ghost: "bg-transparent text-fog font-medium",
  danger: "bg-transparent text-rose border border-rose/40 font-medium",
};

/**
 * The one button. Spring press (scale 0.97), light haptic on tap,
 * ember primary reserved for the single most important action per screen.
 */
export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  children,
  onClick,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={(e) => {
        void haptic("light");
        onClick?.(e);
      }}
      className={[
        "relative select-none rounded-2xl outline-none",
        size === "lg" ? "h-14 px-7 text-[17px]" : "h-12 px-5 text-[15px]",
        block ? "w-full" : "",
        VARIANT_CLASSES[variant],
        "disabled:opacity-40 disabled:pointer-events-none",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
