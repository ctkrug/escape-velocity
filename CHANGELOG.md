# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-07-14

### Added

- Landing build under `site/`: the app plus a visible GitHub link, Open Graph tags, and a
  below-the-fold section with search-intent copy and an FAQ.
- `docs/launch/devto.md` build article and property-based tests (fast-check) across the
  physics, input, HUD, particle, and stats modules.

### Changed

- Renamed the product to **Apogee** (the repo slug is unchanged). The wordmark's "O" is now the
  planet, with a satellite dot orbiting it.

### Fixed

- Clamped the inverse-square term away from the `r = 0` singularity so the integrator can no
  longer produce a `NaN` state that stalls outcome classification.

## [0.1.0]

### Added

- Drag-to-launch (mouse and touch) from a standoff launch pad above the planet, with a live
  drag indicator and a numerically-integrated flight rendered as a real-time trajectory trace.
- Outcome resolution for all three physical outcomes — crash (debris burst, screen shake,
  danger flash), orbit (glow-pulse ring after 2 held orbital periods, "ORBIT LOCKED" HUD), and
  escape ("ESCAPED") — each with a themed overlay showing the run's stats and a "Launch
  Another" CTA.
- Live HUD: velocity, altitude, apoapsis/periapsis, orbital period, and a lifetime orbit count
  persisted in `localStorage`.
- Synthesized WebAudio SFX (drag-charge, launch, crash, orbit-lock, UI-click) behind a mute
  toggle that persists across reloads.
- Adjustable gravity (GM) slider, locked during flight so it can't rewrite a trajectory in
  progress.
- Reduced-motion support (suppresses shake/particles, keeps physics/HUD running) and themed
  hover/focus-visible/active/disabled states across all controls.
- `docs/ARCHITECTURE.md` module map and state-machine reference.
- Project scaffold: static HTML/CSS/JS app with a Vitest-tested two-body gravity engine
  (`src/physics.js`) and a physics-backed placeholder canvas render.
- `docs/VISION.md`, `docs/BACKLOG.md`, and `docs/DESIGN.md` planning docs.
- GitHub Actions CI running the test suite on every push and pull request.
