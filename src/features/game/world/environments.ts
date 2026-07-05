/**
 * The six districts. Each defines a muted palette and an architectural
 * signature the CityPainter interprets — silhouettes stay dark so the
 * player and event gates always read first.
 */
export type RoofStyle =
  | "spire" // slender towers, pointed crowns
  | "block" // heavy rectangular masses
  | "slant" // sleek diagonal rooflines
  | "arch" // rounded crowns
  | "step" // ziggurat setbacks
  | "rail"; // low-rise with an elevated metro line

export interface EnvironmentTheme {
  name: string;
  skyTop: number;
  skyBottom: number;
  /** Far → near parallax band fills. */
  bands: [number, number, number];
  /** Warm accent used for sparse lit windows / signage. */
  accent: number;
  groundColor: number;
  groundLine: number;
  roof: RoofStyle;
}

export const ENVIRONMENTS: readonly EnvironmentTheme[] = [
  {
    name: "Ethereum City",
    skyTop: 0x0b0e17,
    skyBottom: 0x1b2033,
    bands: [0x131828, 0x0e1220, 0x090c15],
    accent: 0x8ea2ff,
    groundColor: 0x070910,
    groundLine: 0x2c3554,
    roof: "spire",
  },
  {
    name: "Bitcoin District",
    skyTop: 0x0d0d13,
    skyBottom: 0x2a2118,
    bands: [0x1a1712, 0x12100c, 0x0a0908],
    accent: 0xe8a33d,
    groundColor: 0x080706,
    groundLine: 0x4a3a22,
    roof: "block",
  },
  {
    name: "Solana Skyline",
    skyTop: 0x0a0f16,
    skyBottom: 0x14283a,
    bands: [0x102030, 0x0b1622, 0x070d14],
    accent: 0x53e0c4,
    groundColor: 0x060a0e,
    groundLine: 0x1f4a4a,
    roof: "slant",
  },
  {
    name: "Base Heights",
    skyTop: 0x0b0e19,
    skyBottom: 0x16223f,
    bands: [0x121b33, 0x0d1425, 0x080c17],
    accent: 0x6f8bff,
    groundColor: 0x070a12,
    groundLine: 0x28345c,
    roof: "arch",
  },
  {
    name: "Arbitrum Towers",
    skyTop: 0x0c0f18,
    skyBottom: 0x232b3d,
    bands: [0x161d2e, 0x101623, 0x0a0d16],
    accent: 0x9db7e8,
    groundColor: 0x080a10,
    groundLine: 0x333f5e,
    roof: "step",
  },
  {
    name: "Hyperliquid Metro",
    skyTop: 0x0a1014,
    skyBottom: 0x122e33,
    bands: [0x0f2228, 0x0a171c, 0x060e11],
    accent: 0x4fd6a3,
    groundColor: 0x05090b,
    groundLine: 0x1d4a44,
    roof: "rail",
  },
] as const;

export function environmentAt(index: number): EnvironmentTheme {
  return ENVIRONMENTS[((index % ENVIRONMENTS.length) + ENVIRONMENTS.length) % ENVIRONMENTS.length]!;
}
