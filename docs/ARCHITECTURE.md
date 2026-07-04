# CRYPTO FLOW — Architecture

> A premium 2D endless runner where a crypto trader outruns the Bear Market.
> Portrait-first. Mobile-native feel. Momentum is the core mechanic.

This document is the source of truth for how the codebase is organised and how
every system works. Read it before adding a feature.

---

## 1. Guiding principles

1. **Native app, not website.** One Next.js static-export shell, no URL-based
   navigation during play. Screens are a typed state machine animated with
   Framer Motion. Capacitor wraps the exported bundle for iOS/Android.
2. **Phaser owns the run, React owns everything else.** The gameplay loop
   never touches React state. A typed event bus (`GameEventBus`) carries
   snapshots out of Phaser at a throttled rate for the HUD.
3. **Everything procedural.** The silhouette player is a code-driven skeletal
   rig, cities are generated parallax geometry, audio is synthesized with
   WebAudio. No binary assets → crisp at any DPI, tiny bundle, fully original.
4. **Offline-first services.** All persistence flows through service
   interfaces. Firebase adapters are used when configured; a local adapter
   keeps the full game playable without any backend (dev, CI, airplane mode).
5. **Feature folders, strong types, zero duplicated logic.** Domain types live
   in `src/types`. Balance/tuning constants live in dedicated `config.ts`
   files per system, never inline.

---

## 2. Tech stack

| Concern             | Choice                                             |
| ------------------- | -------------------------------------------------- |
| Shell / UI          | Next.js 15 (App Router, `output: "export"`), React 19, TypeScript strict |
| Gameplay            | Phaser 3 (WebGL, portrait, single `RunScene`)      |
| UI animation        | Framer Motion                                      |
| Styling             | Tailwind (utility classes only, custom design tokens, **no UI library**) |
| State               | Zustand stores (navigation, session, settings, run) |
| Backend             | Firebase Auth + Firestore + Storage, Cloud Functions (server-validated scores) |
| Native packaging    | Capacitor 7 (Haptics, StatusBar, Preferences, App) |
| Audio               | WebAudio synthesis (`SoundDirector`)               |

---

## 3. Folder structure

```
src/
  app/                      Next.js shell (layout, page, viewport, global css)
  components/               Shared handcrafted UI primitives
    Button, Screen, TopBar, Modal, AnimatedNumber, Avatar, ProgressBar, …
  features/
    auth/                   Sign-in screen (Google / Guest), auth gate
    onboarding/             Username + display name + avatar creation
    home/                   Home menu, living skyline background
    game/
      engine/               Phaser bootstrap, GameEventBus, run lifecycle
      scenes/               BootScene, RunScene
      systems/              momentum, scoring, spawner (procedural chunks),
                            bear market AI, difficulty director
      market/               Market event catalog + weighted generator
      player/               SilhouetteRig (skeletal poses), PlayerController
      world/                Environment themes, parallax city painter, ground
      input/                SwipeController (touch + keyboard fallback)
      audio/                SoundDirector (music layers + synthesized SFX)
      hud/                  React HUD (portfolio ticker, momentum, combo, event banner)
      GameScreen.tsx        Mounts Phaser + HUD + pause/game-over overlays
    portfolio/              Portfolio math + animated counters
    profile/                Profile screen (stats, achievements grid)
    leaderboard/            Global / weekly / friends tabs, realtime
    achievements/           Achievement definitions + evaluation engine
    rewards/                Daily reward streak logic + claim screen
    tutorial/               Interactive swipe tutorial
    settings/               Music/SFX/haptics/graphics/language/privacy
    about/                  Credits + version
    splash/                 Animated logo splash
  lib/
    firebase/               Client init, auth service, Firestore repositories
    services/               Service interfaces + local fallback adapters
    native/                 Capacitor wrappers (haptics, status bar, storage)
    utils/                  format, math, rng (seeded), time
  stores/                   Zustand stores
  types/                    Domain models (Player, RunStats, MarketEvent, …)
functions/                  Cloud Functions (score validation, weekly reset)
docs/                       This document + roadmap
```

---

## 4. Application flow

```
Splash (animated logo)
  → AuthGate ── signed out ──→ AuthScreen (Google / Guest)
        │                          │ first login
        │                          ▼
        │                     Onboarding (username → display name → avatar)
        ▼
      Home ⇄ Profile / Leaderboard / Achievements / Rewards / Tutorial / Settings / About
        │
        ▼
      Game (Phaser RunScene + React HUD) → Game Over → Home / Retry
```

`stores/navigation.ts` holds `screen: ScreenId` plus a transition direction.
`AppShell` renders the active screen inside `AnimatePresence`. Android
hardware back is mapped to `navigation.back()` via Capacitor's App plugin.

---

## 5. Gameplay systems

### 5.1 The run

`RunScene` scrolls the world; the trader holds a fixed screen x. World speed
is a function of **momentum**. The scene composes pure systems — it contains
no game rules itself:

- `MomentumSystem` — 0..100. Correct reactions add, mistakes subtract, slow
  passive decay pushes the player to keep flowing. Momentum drives world
  speed, music intensity, bear distance and score multiplier.
- `DifficultyDirector` — a distance-driven curve raising event density,
  event difficulty tier, and required reaction windows.
- `ChunkSpawner` — procedural level generation. Streams ground segments,
  gaps, ledges and **market event gates** ahead of the player, themed by the
  active environment. Guarantees fairness (min spacing scaled by speed).
- `MarketEventEngine` — picks the next event from the catalog using
  difficulty-aware weighted RNG (seeded per run for replay determinism).
- `BearMarketSystem` — the pursuer. A dark wavefront that stays off-screen at
  high momentum, creeps into frame after mistakes, and ends the run on
  contact. Distance is a spring toward `f(momentum)` so tension builds
  smoothly.
- `ScoringSystem` — distance + correct decisions × combo × momentum
  multiplier + portfolio growth bonus.
- `PortfolioSystem` — simulated portfolio value; correct reads pump it,
  mistakes draw it down. Feeds the HUD ticker.

### 5.2 Market events as obstacles

Every obstacle **is** a market event: `{ id, title, description, difficulty,
bestAction, palette, telegraph, reward, penalty }`. The catalog includes
Whale Buy (jump), Protocol Hack (slide), Bridge Exploit (exit), ETF Approval
(rotate), Token Unlock, Governance Vote, Liquidation Cascade, Stablecoin
Depeg, Airdrop, Protocol Upgrade, Exchange Hack, Flash Crash.

Each gate telegraphs itself (icon glyph + colour pulse) before arrival.
Resolution:

- **Correct action in window** → clean traversal animation, +momentum,
  +portfolio, combo++, reward toast.
- **Wrong/no action** → trip + recovery animation, −momentum, −portfolio,
  combo reset, bear lunges closer. Two consecutive full-penalty hits at zero
  momentum = caught.

### 5.3 Controls

`SwipeController` performs gesture recognition on pointer deltas (distance +
dominant axis + max duration): **up = Jump, down = Slide, left = Exit
Position (phase-dash back), right = Rotate Position (flip-dash forward)**.
Keyboard arrows mirror gestures for desktop testing. Haptics fire on
resolution (light = success, medium = mistake) through the native layer.

### 5.4 The silhouette player

`SilhouetteRig` is a procedural skeleton (head, torso, pelvis, 2×arm, 2×leg
with joints) rendered as rounded strokes into a `Phaser.GameObjects.Graphics`.
Animation = pose keyframes + phase functions:

- Locomotion (run) is a parametric cycle driven by speed, so cadence
  naturally accelerates with momentum.
- Actions (jump, double jump, slide, roll, vault, wall run, trip, recovery,
  death, idle, landing) are keyframe sequences; the animator cross-fades
  between poses with cubic easing — **nothing snaps**.

### 5.5 Environments

Six themed districts rotate every ~600 m: Ethereum City, Bitcoin District,
Solana Skyline, Base Heights, Arbitrum Towers, Hyperliquid Metro. Each theme
defines a muted palette, skyline silhouette parameters, and set dressing.
`CityPainter` renders 3 parallax bands + sky gradient to textures at theme
switch; crossfade handles transitions.

### 5.6 Audio

`SoundDirector` builds an ambient electronic bed from layered oscillators +
filtered noise. Momentum maps to layer gains and filter cutoff, so the music
physically intensifies with flow. SFX (jump whoosh, success ping, error thud,
combo riser, bear rumble, UI ticks) are short synthesized envelopes. Master
gains respect the settings store; the whole director no-ops when muted.

---

## 6. Data model (Firestore)

```
players/{uid}                 PlayerProfile (username, displayName, avatarId,
                              level, xp, coins, bestScore, bestCombo,
                              bestPortfolio, gamesPlayed, totalDistance,
                              createdAt, lastLogin)
usernames/{usernameLower}     { uid }            ← uniqueness reservation
players/{uid}/achievements/{id}   { unlockedAt, progress }
players/{uid}/runs/{runId}    RunRecord (score, distance, combo, portfolio,
                              correct, mistakes, seed, duration, createdAt)
leaderboards/global/entries/{uid}    LeaderboardEntry (denormalised)
leaderboards/weekly-{isoWeek}/entries/{uid}
rewards/{uid}                 { streak, lastClaimDay }
```

Username uniqueness uses a transaction over `usernames/{lower}`. Leaderboard
writes are denormalised on run completion; Cloud Functions re-validate scores
server-side (max plausible score per second of play) and own the weekly
rollover. Realtime updates come from `onSnapshot` listeners.

**Auth:** Google + Anonymous now; the provider enum and UI already reserve a
slot for Apple Sign In (`auth/providers.ts`) so adding it is config, not
rework. Anonymous accounts upgrade in place via `linkWithPopup`.

---

## 7. Services layer

```ts
interface AuthService      { signInWithGoogle(); signInAsGuest(); signOut(); onChange(cb) }
interface PlayerRepository { get(uid); create(profile); update(uid, patch); claimUsername(...) }
interface LeaderboardService { top(board, n); around(board, uid); submit(entry); subscribe(board, cb) }
interface RewardsService   { state(uid); claim(uid) }
```

`lib/services/index.ts` picks the Firebase implementation when
`NEXT_PUBLIC_FIREBASE_API_KEY` is present, otherwise the **local adapter**
(Capacitor Preferences / localStorage). UI code never imports Firebase
directly.

---

## 8. Design language

- **Palette:** deep ink navy (`#0B0E17`) base, soft indigo/slate surfaces,
  one warm signal colour (ember `#E8A33D`) used sparingly. No neon rainbow,
  no glassmorphism.
- **Typography:** native system stacks (SF Pro / Roboto) with a strict
  scale — display 34/700 tight, title 22/650, body 15/450, caption
  12/500 uppercase-tracked. Tabular numerals for all counters.
- **Motion:** every entrance eased (`cubicBezier(0.22, 1, 0.36, 1)`),
  spring-based presses (scale 0.97), staggered menu reveal, animated number
  counters. Nothing appears instantly.
- **Layout:** generous vertical rhythm, safe-area aware, thumb-zone actions.

---

## 9. Quality bars

- TypeScript `strict`; no `any` in domain code.
- `npm run build` (static export) and `npm run typecheck` must pass.
- Gameplay tuning constants centralised in `config.ts` per system.
- Every system documented with a header comment explaining its contract.
