"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Screen } from "@/components/Screen";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/Button";
import { useNavigation } from "@/stores/navigation";
import { haptic } from "@/lib/native";
import type { PlayerAction } from "@/types";
import { MARKET_EVENTS } from "@/features/game/market/catalog";

interface Lesson {
  action: PlayerAction;
  verb: string;
  gesture: string;
  arrow: { x: number; y: number };
  detail: string;
}

const LESSONS: Lesson[] = [
  {
    action: "jump",
    verb: "Jump",
    gesture: "Swipe up",
    arrow: { x: 0, y: -1 },
    detail: "Ride pumps, clear gaps, vault upgrades.",
  },
  {
    action: "slide",
    verb: "Slide",
    gesture: "Swipe down",
    arrow: { x: 0, y: 1 },
    detail: "Duck under crashes, hacks and gas spikes.",
  },
  {
    action: "exit",
    verb: "Exit Position",
    gesture: "Swipe left",
    arrow: { x: -1, y: 0 },
    detail: "Bail out of exploits before they drain you.",
  },
  {
    action: "rotate",
    verb: "Rotate Position",
    gesture: "Swipe right",
    arrow: { x: 1, y: 0 },
    detail: "Chase the inflow when the market turns bullish.",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SWIPE_MIN = 42;

/**
 * Interactive tutorial: each verb must actually be performed on the practice
 * card before the next lesson unlocks. Ends with the momentum/bear briefing.
 */
export function TutorialScreen({ direction }: { direction: 1 | -1 }) {
  const go = useNavigation((s) => s.go);
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  const lesson = LESSONS[index];
  const done = index >= LESSONS.length;
  const exampleEvent = lesson
    ? MARKET_EVENTS.find((e) => e.bestAction === lesson.action)
    : undefined;

  const handleSwipe = (dx: number, dy: number) => {
    if (!lesson) return;
    if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const performed: PlayerAction = horizontal
      ? dx > 0
        ? "rotate"
        : "exit"
      : dy > 0
        ? "slide"
        : "jump";
    if (performed === lesson.action) {
      void haptic("success");
      setFlash("ok");
      setTimeout(() => {
        setFlash(null);
        setIndex((i) => i + 1);
      }, 450);
    } else {
      void haptic("error");
      setFlash("no");
      setTimeout(() => setFlash(null), 450);
    }
  };

  return (
    <Screen direction={direction}>
      <TopBar title="Tutorial" />
      <div className="flex flex-1 flex-col px-6 pb-safe">
        {/* progress */}
        <div className="flex justify-center gap-2 py-3">
          {LESSONS.map((l, i) => (
            <motion.span
              key={l.action}
              className="h-1.5 rounded-full"
              initial={false}
              animate={{
                width: i === index ? 24 : 8,
                backgroundColor:
                  i < index
                    ? "var(--color-mint)"
                    : i === index
                      ? "var(--color-ember)"
                      : "var(--color-line)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!done && lesson ? (
            <motion.div
              key={lesson.action}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-1 flex-col"
            >
              <div className="pt-4 text-center">
                <p className="text-caption text-fog-dim">{lesson.gesture}</p>
                <h2 className="text-display mt-1 text-snow">{lesson.verb}</h2>
                <p className="text-body mt-2 text-fog">{lesson.detail}</p>
              </div>

              {/* practice surface */}
              <div
                className={`relative mt-6 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border transition-colors duration-300 ${
                  flash === "ok"
                    ? "border-mint bg-mint/5"
                    : flash === "no"
                      ? "border-rose bg-rose/5"
                      : "border-line bg-ink-raised"
                }`}
                onPointerDown={(e) => setStart({ x: e.clientX, y: e.clientY })}
                onPointerUp={(e) => {
                  if (!start) return;
                  handleSwipe(e.clientX - start.x, e.clientY - start.y);
                  setStart(null);
                }}
              >
                {exampleEvent && (
                  <div className="mb-8 flex flex-col items-center gap-1">
                    <span
                      className="text-[40px]"
                      style={{
                        color: `#${exampleEvent.tint.toString(16).padStart(6, "0")}`,
                      }}
                    >
                      {exampleEvent.glyph}
                    </span>
                    <span className="text-body font-semibold text-snow">
                      {exampleEvent.title}
                    </span>
                    <span className="text-body max-w-56 text-center text-fog-dim">
                      {exampleEvent.description}
                    </span>
                  </div>
                )}
                {/* looping gesture hint */}
                <motion.div
                  animate={{
                    x: [0, lesson.arrow.x * 46, lesson.arrow.x * 46],
                    y: [0, lesson.arrow.y * 46, lesson.arrow.y * 46],
                    opacity: [0.9, 0.9, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    times: [0, 0.6, 1],
                    ease: "easeOut",
                  }}
                  className="h-12 w-12 rounded-full border-2 border-ember"
                />
                <p className="text-caption mt-6 text-fog-dim">
                  Try it — swipe on this card
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-1 flex-col justify-center gap-5"
            >
              <h2 className="text-display text-center text-snow">
                One more thing
              </h2>
              <Brief
                title="Momentum is life"
                body="Correct reads build momentum. Momentum is speed, score multiplier and distance from the bear."
              />
              <Brief
                title="The Bear Market hunts"
                body="Mistakes bleed momentum. Lose enough and the red wave enters the frame. Touch it and the run is over."
              />
              <Brief
                title="Your portfolio keeps score"
                body="Every event moves your bag. Compound it. Legends retire with millions."
              />
              <div className="pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  block
                  onClick={() => go("game")}
                >
                  Start running
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}

function Brief({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-raised p-5">
      <h3 className="text-body font-semibold text-ember">{title}</h3>
      <p className="text-body mt-1 text-fog">{body}</p>
    </div>
  );
}
