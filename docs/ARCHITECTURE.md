# Architecture — Escape Velocity

Static site, no build step: `index.html` + `styles/main.css` + `src/*.js` (ES modules) served
as-is. `npm run dev` just puts a static file server in front of the repo root.

## Module map

```
src/
  physics.js    pure two-body gravity: acceleration (r2 clamped away from zero so the
                x=y=0 singularity can't NaN the sim), stepSimulation (symplectic Euler),
                circularOrbitVelocity, escapeVelocity, specificOrbitalEnergy,
                orbitalElements (apoapsis/periapsis/period for a bound orbit),
                classifyOutcome (crash | orbit | escape | flying)
  input.js      pure drag geometry: dragVector/dragDistance, clampToMaxDistance,
                launchVelocity (drag vector * sensitivity, no slingshot inversion)
  hud.js        formats a live simulation state into unit-labeled HUD strings, falling back
                to "—" instead of NaN/undefined/Infinity when a value isn't meaningful
  particles.js  debris-burst simulation for the crash outcome (seeded PRNG, injectable
                for deterministic tests); createDebrisBurst / updateParticles / particleOpacity
  audio.js      WebAudio synth engine (oscillators + filtered noise, no audio assets):
                drag-charge / launch / crash / orbit-lock / UI-click, lazy AudioContext,
                mute persisted via storage.js, no-ops (never throws) if AudioContext
                is unavailable
  storage.js    guarded localStorage get/set (numbers/booleans), injectable storage so
                every consumer is testable without a real browser
  stats.js      orbit-count persistence, built on storage.js
  main.js       DOM glue: canvas render loop, pointer/touch input, state machine, and
                wiring for the HUD/controls/overlay — not unit tested directly (thin
                orchestration layer); verified by driving the built page in a browser
```

Everything except `main.js` is pure/DOM-free and unit tested under `tests/`. `main.js` is kept
intentionally thin — it imports and wires the modules above rather than reimplementing logic,
so the DOM layer has as little untested surface as possible.

## Data flow / state machine

`main.js` holds a single `phase`: `idle → dragging → flying → resolved`, plus the live
`satellite` state `{x, y, vx, vy}` in world units (1 unit = 1 canvas px; canvas origin is
translated to its own center each frame, so world coordinates are planet-centered).

- **idle** — satellite rests at `LAUNCH_RADIUS` from the planet center (a standoff above
  `PLANET_RADIUS`, not the surface itself — see the comment in `main.js` on why launching
  exactly at the surface makes a stable orbit unreachable). The gravity slider is live.
- **dragging** — pointer/touch down anchors on the launch pad; move updates a clamped drag
  vector (`input.js`) and renders a live indicator; a drag-charge SFX throttles to ~11/s.
  Release computes `launchVelocity` and transitions to flying.
- **flying** — each animation frame accumulates `dt * TIME_SCALE` (sim time runs faster than
  wall-clock so 2-period orbit-lock and escape resolution stay snappy) and steps
  `stepSimulation` in fixed `SIM_DT` substeps, pushing trace points and re-running
  `classifyOutcome` after every substep. `orbitHoldTime` accumulates while classified
  `"orbit"` and resets otherwise; hitting `2 * orbitalElements(...).period` locks the orbit.
  Crash/escape/orbit-lock all call `resolveOutcome`, which transitions to `resolved`.
- **resolved** — physics stops advancing; the outcome overlay shows run stats (launch
  velocity, plus apoapsis/periapsis/period for an orbit or altitude otherwise) with a
  "Launch Another" CTA that calls the same `resetScene()` as the Reset button.

## Rendering

`render()` runs every `requestAnimationFrame` regardless of phase (so the idle scene and the
drag indicator animate too): grid → trajectory trace → orbit-lock pulse ring → planet → debris
particles → drag indicator → satellite → HUD text update. The canvas backing buffer is sized to
`devicePixelRatio × CSS size` in `resize()`, re-run on `window.resize`.

## Verified behavior

Beyond the Vitest suite (`npm test` — physics/input/hud/particles/stats/audio/storage, all
DOM-free, 100% line / ~95% branch coverage on those modules per `npm run test:coverage`), the
math-heavy modules (`physics.js`, `input.js`, `hud.js`, `particles.js`, `stats.js`) also carry
[fast-check](https://github.com/dubzzz/fast-check) property tests asserting invariants across
randomized inputs (acceleration always finite/attractive, orbital elements always ordered
periapsis ≤ semiMajorAxis ≤ apoapsis, `stepSimulation` never produces NaN, `clampToMaxDistance`
never exceeds its cap, the HUD never renders a raw NaN/Infinity, orbit count is always a
non-negative integer) rather than only the hand-picked example cases above them. The built page
has been driven end-to-end in headless Chromium, Firefox, and WebKit (mouse **and**
touch drag-to-launch, all three outcomes, HUD live updates, mute-state + orbit-count persistence
across reload — including hand-corrupted/malformed localStorage values, which fall back cleanly
— `prefers-reduced-motion` suppressing shake/particles while outcomes still resolve, gravity
slider disabled mid-flight, resize mid-drag, rapid double-click/reset hammering, keyboard-only
operation of every control with visible focus, and 390/768/1440 layouts). A 12-round replay
under Chromium showed a flat DOM node count and no monotonic heap growth (no listener/interval
leak). Core-logic mutation testing (flipping `<=`/`>=`/`>` boundaries in physics/particles) is
caught by the suite except one confirmed-equivalent mutant in `input.js` where the two branches
produce byte-identical output at that exact boundary.

## Running / testing

```bash
npm install
npm test                # vitest run — full unit suite
npm run test:coverage   # same, with a v8 coverage report (see vitest.config.js for thresholds)
npm run dev             # static file server (http-server) for manual verification
```
