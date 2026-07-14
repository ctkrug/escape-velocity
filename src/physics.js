// Scaled world units, not SI: GM below is the gravitational strength the
// simulation actually integrates with, chosen so the numbers stay friendly
// for a canvas at typical screen sizes rather than modeling real meters/kg.
export const DEFAULT_GM = 4000;

export function acceleration(x, y, gm = DEFAULT_GM) {
  const r2 = x * x + y * y;
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
