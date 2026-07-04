export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Frame-rate independent exponential smoothing.
 * `halfLife` = seconds for the value to close half the remaining gap.
 */
export function damp(
  current: number,
  target: number,
  halfLife: number,
  dtSeconds: number,
): number {
  if (halfLife <= 0) return target;
  const k = 1 - Math.pow(0.5, dtSeconds / halfLife);
  return current + (target - current) * k;
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Map v from [a0, a1] into [b0, b1], clamped. */
export function remap(
  v: number,
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  const t = clamp01((v - a0) / (a1 - a0));
  return lerp(b0, b1, t);
}
