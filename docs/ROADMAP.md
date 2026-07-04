# CRYPTO FLOW — Implementation Roadmap

Each phase is completed (typechecks, builds, playable where relevant) before
the next begins. Order is chosen so every later system builds on a stable
foundation.

## Phase 0 — Foundation ✅ target
- Repo scaffolding: Next.js 15 static export, TypeScript strict, Tailwind
  tokens, ESLint.
- Design tokens + global styles (palette, type scale, safe areas).
- Domain types (`src/types`), seeded RNG, formatters, shared utils.
- Zustand stores: navigation, settings, session, run.

## Phase 1 — App shell & identity
- AppShell screen state machine with Framer Motion transitions.
- Splash screen with animated logo.
- Services layer (interfaces + local adapter + Firebase adapter).
- Firebase client init (env-gated), Google + Guest auth, auth gate.
- Onboarding: username claim (uniqueness), display name, avatar picker.

## Phase 2 — Home & supporting screens
- Shared UI kit: Button, Screen, TopBar, Modal, AnimatedNumber, Avatar,
  ProgressBar, Toggle, TabBar.
- Home screen with living skyline background (canvas parallax + particles).
- Settings, About, Tutorial screens.

## Phase 3 — The run (core gameplay)
- Phaser bootstrap + GameEventBus + GameScreen host.
- SwipeController, MomentumSystem, ScoringSystem, PortfolioSystem.
- SilhouetteRig + PlayerController (all 12 animation states, blended).
- CityPainter parallax environments (6 themes) + ChunkSpawner.
- MarketEventEngine + full event catalog + gate telegraphs/resolution.
- BearMarketSystem pursuit + catch sequence.
- DifficultyDirector curve.
- React HUD: portfolio ticker, momentum bar, combo, score, event toasts.
- Pause + Game Over flow with run summary.

## Phase 4 — Audio & feel
- SoundDirector: momentum-layered ambient music, synthesized SFX.
- Haptics wiring, screen shake, hit-stop, particle polish.

## Phase 5 — Meta game
- XP/level curve, coins, run→profile stat merge.
- Achievements engine + screen.
- Daily rewards streak + claim flow.
- Leaderboards (global/weekly/friends) with realtime subscription.
- Profile screen.

## Phase 6 — Platform & backend hardening
- Capacitor config + native wrappers (haptics, status bar, back button).
- Cloud Functions: score validation, weekly leaderboard rollover.
- Firestore security rules.
- README: setup, env, native build instructions.

## Definition of done (per phase)
- `npm run typecheck` and `npm run build` pass.
- No placeholder screens reachable from shipped navigation.
- Tuning constants live in config files, not inline.
