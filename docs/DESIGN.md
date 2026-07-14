# Design — Apogee

## Aesthetic direction

**Blueprint/technical.** Apogee is a blueprint/technical HUD: a cyan-on-navy schematic
grid, dashed trajectory traces, and mission-control readouts — like flight-planning software for
a tiny world, not a cartoon space game. This fits the "real physics, not a canned animation"
premise directly: the page should look like an instrument, not a toy box.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1628` | page background (deep navy) |
| `--surface-1` | `#0f1f38` | canvas / panel fill |
| `--surface-2` | `#142a4a` | raised surfaces, control backgrounds |
| `--text` | `#e8f4ff` | primary text |
| `--text-muted` | `#7a93b8` | secondary text, HUD labels |
| `--accent` | `#4dd8e8` | cyan — planet, orbit trace, primary interactive |
| `--accent-support` | `#ff6b4a` | orange — satellite, crash/danger feedback |
| `--success` | `#5eebb0` | orbit-lock confirmation |
| `--danger` | `#ff5252` | crash flash |

- **Type pairing:** [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) (display —
  weights 500/700) for the wordmark and headings; [JetBrains
  Mono](https://fonts.google.com/specimen/JetBrains+Mono) (UI — weights 400/600) for body text
  and all HUD/data readouts. System fallbacks: `"Segoe UI", sans-serif` / `"Courier New",
  monospace`.
- **Spacing scale:** 4/8px — `--space-1: 4px` through `--space-5: 40px`.
- **Corner radius:** `2px` — sharp, technical, not rounded (blueprints don't have soft corners).
- **Shadow/glow:** cyan glow (`0 0 24px rgba(77, 216, 232, 0.25)`) on the canvas stage and
  interactive elements; dashed 1px borders styled like schematic annotations.
- **Motion:** UI transitions 120–250ms ease-out; in-flight game feedback (impact, orbit-lock)
  60–140ms.

## Layout intent

The hero is the simulation canvas itself — the planet, the drag gesture, the live trajectory.
On desktop (1440×900) the canvas takes the vertical majority of the viewport (~60vh, centered,
max-width 900px) with the wordmark above and a compact HUD readout strip below it; no side
panel competing for attention. On phone (390×844) the canvas stays full-bleed width and reflows
to ~45vh so the masthead, canvas, and HUD all fit above the fold without a fixed pixel box
floating in empty space.

## Signature detail

The "O" of the `APOGEE` wordmark is the planet: it glows in the cyan accent and a tiny orange
satellite dot orbits it continuously — a live miniature of the app's own mechanic, reinforcing
the brand every time someone looks at the header. (Held static under
`prefers-reduced-motion` rather than removed.)

## The juice plan (games/toys)

- **Movement:** the satellite's flight path is the live numerically-integrated trajectory itself
  — no separate tween needed, the physics *is* the motion. The drag arrow while charging tweens
  in under 100ms so pulling back feels immediate.
- **Impact feedback (crash):** a debris particle burst at the impact point plus a brief
  screen micro-shake and a `--danger` flash pulse on the planet rim, all within 150ms of impact.
- **Goal feedback (orbit lock):** once an orbit is confirmed stable for a couple of periods, a
  `--success` glow pulse ring traces the orbit path and a "ORBIT LOCKED" HUD readout pops in.
- **Win celebration (any resolved outcome):** an overlay with the run's stats (velocity at
  launch, outcome, altitude/period for an orbit) plus a "Launch Another" CTA that resets the
  scene instantly.
- **Synth SFX (WebAudio, generated in code — no audio files):**
  - drag-charge: a low sine oscillator that rises in pitch with drag distance
  - launch: a short filtered noise burst ("whoosh")
  - crash: a low noise thud with a fast descending pitch sweep
  - orbit-lock: a bright ascending three-note chime
  - UI click: a short 40ms blip on buttons/controls
  - All SFX are subtle-volume, rate-throttled, created lazily on first user gesture (autoplay
    policy), and behind a mute toggle whose state persists in `localStorage`.
- Respect `prefers-reduced-motion`: drop the screen shake and particle bursts, keep the flash/
  glow feedback (color-only) so outcomes are still legible.

## Design polish acceptance

Every epic below carries its own "design polish" story scheduled against this document — see
`docs/BACKLOG.md`. Changes to this direction happen deliberately, in their own commit, with the
reason stated in the commit body.
