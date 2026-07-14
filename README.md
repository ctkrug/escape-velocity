# Escape Velocity

Drag to launch a satellite from a tiny planet — with real two-body gravity. Release the
drag and watch the trajectory arc back into the planet in a puff of debris, or snap into a
stable, glowing orbit that loops forever. Pull hard enough and it escapes into space entirely.

## Why

Most "gravity toys" on the web are either a canned animation or a full sandbox you have to
learn before anything interesting happens. Escape Velocity is neither: one planet, one drag,
one release. The physics underneath is real — inverse-square gravity integrated numerically,
frame by frame — so every launch is an actual orbital-mechanics outcome, not a scripted one.

## The moment

You click-drag from the planet and let go. The satellite either:

- **crashes** — the trajectory arcs back and it's gone in a burst of debris,
- **orbits** — it snaps into a stable, glowing loop that keeps going, or
- **escapes** — pull hard enough and it breaks free past escape velocity and flies off screen.

## Features

- Real two-body gravitational simulation, semi-implicit Euler integration
- Drag-to-launch with mouse and touch support, live drag indicator
- Live HUD: velocity, altitude, apoapsis/periapsis, orbital period, lifetime orbit count
- Synthesized WebAudio SFX for drag-charge, launch, crash, orbit-lock, and UI clicks — no
  audio files — behind a mute toggle that persists across reloads
- Adjustable gravity strength (locked mid-flight so it never rewrites a trajectory in progress)
- Reduced-motion and keyboard-accessible throughout
- Fully responsive, zero-install, static site — nothing to build or deploy but HTML/CSS/JS

## Stack

Vanilla JavaScript (ES modules) + Canvas 2D — no framework, no bundler; the app ships as static
files. [Vitest](https://vitest.dev) covers the physics engine with unit tests.

## Getting started

```bash
npm install
npm test                # run the full unit test suite (physics, input, hud, particles, stats, audio, storage)
npm run test:coverage   # same, with a v8 coverage report
npm run dev             # serve the static site locally
```

Then open the served URL. The whole app is `index.html` + `src/` + `styles/`, no build step.

## Project docs

- [`docs/VISION.md`](docs/VISION.md) — problem, audience, core idea, what "done" looks like
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — epic/story breakdown with acceptance criteria
- [`docs/DESIGN.md`](docs/DESIGN.md) — visual direction, tokens, and the juice plan
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map, data flow, how to run/test

## License

MIT — see [LICENSE](LICENSE).
