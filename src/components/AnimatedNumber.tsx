"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutCubic } from "@/lib/utils/math";

interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
}

/**
 * Counter that rolls toward its target with an eased tween — used for
 * portfolio, score and coin displays so numbers never snap.
 */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  duration = 600,
  className = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (value - from) * easeOutCubic(t);
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={`tnum ${className}`}>{format(display)}</span>;
}
