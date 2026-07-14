# Backlog — Escape Velocity

Stories are marked `[ ]` until done. Every story has concrete, verifiable acceptance criteria —
build implements to them, QA attacks them.

## Epic 1 — Core physics & the wow moment

The first story here IS the wow moment: drag, release, watch real two-body gravity resolve to a
crash, a stable orbit, or an escape.

- [x] **1.1 Two-body gravity simulation engine**
  - Given a fixed circular-orbit tangential velocity at radius `r`, `classifyOutcome` reports
    `"orbit"`.
  - `stepSimulation` conserves specific orbital energy to within 2% over 2000 steps at `dt=0.01`
    for a circular orbit (regression-tested — see `tests/physics.test.js`).
  - Given a velocity below the local circular orbit velocity, the trajectory is eventually
    classified `"crash"`; given a velocity above local escape velocity, it is eventually
    classified `"escape"`.

- [x] **1.2 Canvas rendering of planet, satellite, and live trajectory trace**
  - Canvas backing buffer is sized to `devicePixelRatio × CSS size` and recomputes on window
    resize (no blurring at any tested zoom level).
  - While the satellite is in flight, the trajectory trace updates every animation frame and
    visibly lengthens/curves in real time (not a single static line drawn once).

- [x] **1.3 Drag-to-launch input handling (mouse + touch)**
  - Mousedown-drag-mouseup on the canvas launches the satellite with initial velocity
    proportional to the drag vector's length and direction.
  - The same gesture works via `touchstart`/`touchmove`/`touchend` with no separate code path
    the user has to discover.
  - Dragging shows a live indicator (arrow/line) from the planet to the current pointer position
    before release.

- [x] **1.4 Outcome resolution & feedback (crash / orbit / escape)**
  - A crash triggers a debris particle burst within 150ms of the impact frame.
  - A stable orbit triggers a glow-pulse ring plus an "ORBIT LOCKED" HUD readout after the orbit
    has held for at least two full periods.
  - An escape triggers an "ESCAPED" state once the satellite's distance from the planet exceeds
    a configured escape-boundary radius on a positive-energy trajectory.
  - Drag indicator, trajectory trace, and all outcome feedback use the token colors/motion
    timing specified in `docs/DESIGN.md` (verified against the token table, not eyeballed).

## Epic 2 — Feel, HUD, and accessibility

- [x] **2.1 HUD readouts (velocity, altitude, apoapsis/periapsis, orbital period)**
  - HUD values update at ≥10Hz while the satellite is in flight.
  - All values are formatted with units (e.g. `u/s`, `u`) and never show `NaN`/`undefined`,
    including at the moment of launch (`t=0`) and immediately after a crash.

- [x] **2.2 Synth SFX + mute toggle**
  - Drag-charge, launch, crash, orbit-lock, and UI-click sounds all play via WebAudio
    oscillators/noise — no audio files added to the repo.
  - The `AudioContext` is created lazily on first user gesture and code guards for its absence
    (no thrown error in a headless/test environment).
  - A mute toggle silences all SFX immediately and its state persists across a page reload via
    `localStorage`.

- [x] **2.3 Responsive layout for 390px / 768px / 1440px**
  - No horizontal scroll at any of the three widths.
  - The canvas remains the majority element of the viewport at each width (no dead margins, no
    overlap with the HUD or footer).

- [x] **2.4 Reduced-motion & keyboard accessibility pass**
  - With `prefers-reduced-motion: reduce`, screen shake and particle bursts are suppressed but
    outcome classification and HUD updates still function.
  - Every interactive control (mute toggle, reset button, gravity slider) is reachable via
    `Tab`, shows a visible focus outline, and has themed hover/active/disabled states — none
    render as an unstyled native browser widget; icon-only buttons carry an `aria-label`.

## Epic 3 — Replay & extras

- [x] **3.1 Reset/replay control**
  - Clicking "Reset" restores the planet and satellite to their initial state and clears the
    trajectory trace within one animation frame, without a full page reload.

- [x] **3.2 Adjustable gravity strength**
  - A themed range slider changes the simulated `GM`; changing it while the satellite is idle
    (pre-launch) affects the *next* launch's physics without altering a trajectory already in
    flight.

- [x] **3.3 Local stats: orbit count**
  - The count of successful stable orbits achieved is persisted in `localStorage` and displayed
    in the HUD, surviving a full page reload.

- [x] **3.4 Design polish — signature detail**
  - The orbiting-dot wordmark flourish from `docs/DESIGN.md` is implemented and animates
    continuously (respecting `prefers-reduced-motion` by holding it static instead of removing
    it entirely).

## Epic 4 — Ship readiness

- [x] **4.1 Landing page brand consistency**
  - The page (served from `index.html`, no separate `site/` needed since app and landing page
    are the same static page) uses the favicon and meta description already in place, kept in
    sync with `docs/DESIGN.md` if tokens change.

- [x] **4.2 CI gate on tests**
  - The GitHub Actions workflow runs `npm test` on every push and pull request to `main` and
    fails the build on any red test (already wired — verify it stays green as stories land).

- [x] **4.3 Cross-browser smoke check**
  - QA notes confirm drag-launch works via mouse in at least two desktop browsers and via touch
    emulation in devtools, with any browser-specific issues documented and fixed or filed.
  - Verified: mouse drag-to-launch (crash + escape outcomes) in both Chromium and Firefox
    (headless, automated), and touch drag-to-launch (`touchstart`/`touchmove`/`touchend`) under
    Chromium's touch emulation — identical rendering and behavior, no console errors in either
    engine. Not yet exercised in WebKit/Safari; no issues found in the two engines tested.
