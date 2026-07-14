---
title: "Building Apogee: real orbital mechanics in a browser toy"
published: false
tags: javascript, canvas, gamedev, physics
---

I wanted a gravity toy you could understand in one gesture. Most of the ones I found online are
either a looping animation with no real physics behind it, or a full N-body sandbox you have to
learn before anything happens. So I built [Apogee](https://apps.charliekrug.com/escape-velocity/):
one tiny planet, one satellite, one drag. You pull the satellite off the planet, let go, and real
two-body gravity decides whether it crashes, orbits, or escapes. No login, no install. It is plain
JavaScript and a Canvas, no framework. Here are the two decisions that actually mattered.

## Symplectic Euler, not the naive kind

The obvious way to integrate motion is explicit Euler: update velocity from the current
acceleration, then update position from the old velocity. It is one line and it is wrong for
orbits. Explicit Euler pumps energy into a bound system every step, so a "stable" orbit slowly
spirals outward and the whole illusion falls apart after a few loops.

The fix is a one-character reorder. Update velocity first, then use the *new* velocity to update
position:

```js
export function stepSimulation(state, dt, gm) {
  const { ax, ay } = acceleration(state.x, state.y, gm);
  const vx = state.vx + ax * dt;   // velocity first
  const vy = state.vy + ay * dt;
  const x = state.x + vx * dt;     // then position, from the new velocity
  const y = state.y + vy * dt;
  return { x, y, vx, vy };
}
```

That is semi-implicit (symplectic) Euler. It does not conserve energy exactly, but it keeps the
error bounded instead of growing, so an orbit stays put for as long as anyone watches it. For a
toy whose entire point is "watch a real orbit," that difference is the product.

## The NaN that ate the render loop

Gravity is an inverse-square force, which means dividing by the square of the distance to the
planet. Drop the satellite exactly on the planet center and that distance is zero. You get a
divide-by-zero, the acceleration becomes `NaN`, and `NaN` propagates into position and velocity
forever.

The nasty part was not the math, it was the state machine. The simulation decides a run is over
when the satellite hits the surface: `r <= planetRadius`. But any comparison against `NaN` is
`false`. A `NaN` satellite is never "crashed" and never "escaped," so the run never ends. The loop
just keeps flying an invisible ghost.

The fix is to clamp the squared radius away from zero before dividing:

```js
const MIN_R2 = 1e-6;
const r2 = Math.max(x * x + y * y, MIN_R2);
```

Now the force stays finite at the singularity, the classifier still resolves, and a property test
throws thousands of random launches at the integrator to assert it never produces a non-finite
number.

## One thing that surprised me

A tangential orbit launched from exactly the planet's surface can never register as a stable
orbit, because its closest approach (periapsis) is at the surface by construction, and the
classifier treats "periapsis at or below the surface" as a future crash. The satellite launches
from a small standoff radius above the surface instead, which gives a real clearance margin. I
lost an evening to that before it clicked.

## What I would do differently

The escape boundary sits far off-screen, so a hard launch takes several seconds of watching a dot
drift before the "escaped" readout fires. Next time I would either zoom the camera out as the
satellite climbs or resolve escape from the trajectory's energy the moment it clears the planet,
rather than waiting for it to physically reach the boundary.

Code and full test suite: [github.com/ctkrug/escape-velocity](https://github.com/ctkrug/escape-velocity).
Play it: [apps.charliekrug.com/escape-velocity](https://apps.charliekrug.com/escape-velocity/).
