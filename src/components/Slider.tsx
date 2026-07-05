"use client";

import { useRef } from "react";
import { clamp01 } from "@/lib/utils/math";
import { haptic } from "@/lib/native";

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

/** Touch-first volume slider — full-height hit area, eased fill. */
export function Slider({ value, onChange, label }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const set = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onChange(clamp01((clientX - rect.left) / rect.width));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      className="relative h-10 w-40 cursor-pointer touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        void haptic("light");
        set(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) set(e.clientX);
      }}
    >
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-line" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ember transition-[width] duration-100"
        style={{ width: `${value * 100}%` }}
      />
      <div
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-snow shadow-lg transition-[left] duration-100"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  );
}
