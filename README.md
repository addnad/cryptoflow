# CRYPTO FLOW

**Outrun the Bear Market.** A cinematic 2D endless runner where a crypto
trader parkours through volatile market skylines. Every obstacle is a market
event — Whale Buys, Bridge Exploits, ETF Approvals, Liquidation Cascades —
and survival is momentum.

Portrait-first, mobile-native, built to ship to the App Store and Google
Play via Capacitor.

## The game

- **Swipe verbs:** ↑ Jump · ↓ Slide · ← Exit Position · → Rotate Position
- **Momentum is life.** Correct reads build it; it drives world speed, the
  music's intensity, your score multiplier — and your distance from the
  Bear Market, a volatility wavefront that swallows sloppy traders.
- **13 market events** across 3 difficulty tiers, chosen by a seeded,
  difficulty-weighted generator (every run is replayable from its seed).
- **6 districts** — Ethereum City, Bitcoin District, Solana Skyline, Base
  Heights, Arbitrum Towers, Hyperliquid Metro — each with its own
  architecture, painted procedurally into parallax bands.
- **A simulated portfolio** that compounds with good reads and bleeds with
  bad ones, plus XP/levels, coins, achievements, daily streak rewards and
  realtime global/weekly leaderboards.
- **Zero binary assets.** The silhouette player is a code-driven skeletal
  rig (12 blended animation states), and the entire soundtrack + SFX are
  synthesized WebAudio.

## Stack

Next.js 15 (static export) · React 19 · TypeScript strict · Phaser 3 ·
Framer Motion · Tailwind 4 (utilities only, no UI library) · Zustand ·
Firebase (Auth, Firestore, Cloud Functions) · Capacitor 7.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system
design and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build phases.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 — fully playable offline
```

Without Firebase configuration the app runs on a local services adapter
(auth funnel, profile, leaderboards and rewards all work, persisted to the
device). To go cloud:

1. Create a Firebase project; enable **Google** and **Anonymous** auth and
   **Firestore**.
2. `cp .env.example .env.local` and fill in the web app config.
3. Deploy rules + functions:
   ```bash
   firebase deploy --only firestore:rules
   cd functions && npm install && npm run build && npm run deploy
   ```

## Quality gates

```bash
npm run typecheck  # strict TS, no any in domain code
npm run build      # static export (out/)
```

## Native builds

```bash
npm run build
npx cap add ios && npx cap add android   # first time
npx cap sync
npx cap open ios      # Xcode → archive
npx cap open android  # Android Studio → bundle
```

Portrait orientation, safe-area aware, haptics via `@capacitor/haptics`,
hardware back mapped to in-app navigation.

## Project layout

```
src/
  app/          Next.js shell
  components/   Handcrafted UI kit
  features/     auth · onboarding · home · game (engine/scenes/systems/
                market/player/world/input/audio/hud) · portfolio · profile ·
                leaderboard · achievements · rewards · tutorial · settings ·
                about · splash · shell
  lib/          services (Firebase + local adapters) · firebase · native · utils
  stores/       zustand stores (navigation, session, settings, run)
  types/        domain models
functions/      Cloud Functions (score validation, weekly rollover)
```
