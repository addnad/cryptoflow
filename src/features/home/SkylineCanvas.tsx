"use client";

import { useEffect, useRef } from "react";
import { mulberry32 } from "@/lib/utils/rng";

interface Building {
  x: number;
  w: number;
  h: number;
  windows: { x: number; y: number; phase: number }[];
}

interface Layer {
  color: string;
  speed: number;
  buildings: Building[];
  span: number;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
}

/**
 * The living home-screen backdrop: three parallax skyline bands drifting at
 * different speeds, floating ember motes, breathing window lights and a slow
 * horizon glow. Pure canvas 2D — cheap enough to run under the menu at 60fps.
 */
export function SkylineCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rng = mulberry32(20260704);

    const makeLayer = (
      color: string,
      speed: number,
      minH: number,
      maxH: number,
      spanFactor: number,
    ): Layer => {
      const span = 900 * spanFactor;
      const buildings: Building[] = [];
      let x = 0;
      while (x < span) {
        const w = 34 + rng() * 60;
        const h = minH + rng() * (maxH - minH);
        const windows: Building["windows"] = [];
        if (speed > 8) {
          for (let i = 0; i < (w * h) / 900; i++) {
            windows.push({
              x: 4 + rng() * (w - 10),
              y: 8 + rng() * (h - 24),
              phase: rng() * Math.PI * 2,
            });
          }
        }
        buildings.push({ x, w, h, windows });
        x += w + 6 + rng() * 26;
      }
      return { color, speed, buildings, span: x };
    };

    const layers: Layer[] = [
      makeLayer("#10141f", 3, 90, 200, 1.0),
      makeLayer("#0e1119", 9, 60, 150, 1.2),
      makeLayer("#0b0d14", 18, 30, 110, 1.4),
    ];

    const particles: Particle[] = Array.from({ length: 26 }, () => ({
      x: rng(),
      y: rng(),
      r: 0.6 + rng() * 1.6,
      vy: 4 + rng() * 9,
      vx: 2 + rng() * 5,
      alpha: 0.06 + rng() * 0.22,
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // Sky: deep ink with a slow-breathing warm horizon.
      const glow = 0.5 + 0.5 * Math.sin(t * 0.22);
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#0b0e17");
      sky.addColorStop(0.62, "#0d1120");
      sky.addColorStop(1, `rgba(83, 58, 34, ${0.28 + glow * 0.14})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Parallax skyline bands, back to front.
      for (const layer of layers) {
        const offset = (t * layer.speed) % layer.span;
        ctx.fillStyle = layer.color;
        for (let repeat = -1; repeat <= 1; repeat++) {
          for (const b of layer.buildings) {
            const bx = b.x - offset + repeat * layer.span;
            if (bx + b.w < 0 || bx > width) continue;
            const by = height - b.h;
            ctx.fillRect(bx, by, b.w, b.h);
            // breathing windows on the front band
            for (const w of b.windows) {
              const brightness =
                0.10 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.8 + w.phase));
              ctx.fillStyle = `rgba(232, 163, 61, ${brightness})`;
              ctx.fillRect(bx + w.x, by + w.y, 2.5, 3.5);
            }
            ctx.fillStyle = layer.color;
          }
        }
      }

      // Ember motes drifting upward.
      for (const p of particles) {
        p.y -= (p.vy * dt) / height;
        p.x += (p.vx * dt) / width;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = rng();
        }
        if (p.x > 1.02) p.x = -0.02;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 163, 61, ${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
