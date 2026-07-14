// Scaled world units, not SI: GM below is the gravitational strength the
// simulation actually integrates with, chosen so the numbers stay friendly
// for a canvas at typical screen sizes rather than modeling real meters/kg.
export const DEFAULT_GM = 4000;

// Clamping r2 away from exactly zero keeps the inverse-square factor finite
// at the singularity (x=y=0) instead of NaN — a NaN state can never satisfy
// r <= planetRadius, so classifyOutcome would loop in "flying" forever.
const MIN_R2 = 1e-6;

export function acceleration(x, y, gm = DEFAULT_GM) {
  const r2 = Math.max(x * x + y * y, MIN_R2);
  const r = Math.sqrt(r2);
  const factor = -gm / (r2 * r);
  return { ax: factor * x, ay: factor * y };
}

export function stepSimulation(state, dt, gm = DEFAULT_GM) {
  const { ax, ay } = acceleration(state.x, state.y, gm);
  const vx = state.vx + ax * dt;
  const vy = state.vy + ay * dt;
  const x = state.x + vx * dt;
  const y = state.y + vy * dt;
  return { x, y, vx, vy };
}

export function circularOrbitVelocity(r, gm = DEFAULT_GM) {
  return Math.sqrt(gm / r);
}

export function escapeVelocity(r, gm = DEFAULT_GM) {
  return Math.sqrt((2 * gm) / r);
}

export function specificOrbitalEnergy(state, gm = DEFAULT_GM) {
  const r = Math.hypot(state.x, state.y);
  const v2 = state.vx * state.vx + state.vy * state.vy;
  return v2 / 2 - gm / r;
}

// Orbital elements for a bound (elliptical) trajectory, derived from the
// same specific energy + angular momentum used by classifyOutcome. Returns
// null for a hyperbolic/parabolic trajectory (energy >= 0), where apoapsis
// and orbital period aren't meaningful.
export function orbitalElements(state, gm = DEFAULT_GM) {
  const energy = specificOrbitalEnergy(state, gm);
  if (energy >= 0) return null;

  const h = state.x * state.vy - state.y * state.vx;
  const a = -gm / (2 * energy);
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (gm * gm)));
  const periapsis = a * (1 - e);
  const apoapsis = a * (1 + e);
  const period = 2 * Math.PI * Math.sqrt((a * a * a) / gm);
  return { semiMajorAxis: a, eccentricity: e, periapsis, apoapsis, period };
}

// Classifies where a trajectory is headed: "crash" once it has already hit
// the planet, "orbit" once its ellipse clears the planet at periapsis,
// "escape" once a positive-energy trajectory has cleared escapeRadius, and
// "flying" while still resolving (elliptical but will crash on a future
// pass, or hyperbolic but still inside escapeRadius).
export function classifyOutcome(state, planetRadius, escapeRadius, gm = DEFAULT_GM) {
  const r = Math.hypot(state.x, state.y);
  if (r <= planetRadius) return "crash";

  const energy = specificOrbitalEnergy(state, gm);
  if (energy >= 0) {
    return r >= escapeRadius ? "escape" : "flying";
  }

  const h = state.x * state.vy - state.y * state.vx;
  const a = -gm / (2 * energy);
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (gm * gm)));
  const periapsis = a * (1 - e);
  return periapsis <= planetRadius ? "flying" : "orbit";
}
