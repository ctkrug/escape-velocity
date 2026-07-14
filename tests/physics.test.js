import { describe, it, expect } from "vitest";
import {
  acceleration,
  circularOrbitVelocity,
  stepSimulation,
  specificOrbitalEnergy,
  classifyOutcome,
  orbitalElements,
  escapeVelocity,
} from "../src/physics.js";

describe("acceleration", () => {
  it("points toward the planet and follows inverse-square falloff", () => {
    const near = acceleration(100, 0);
    const far = acceleration(200, 0);
    expect(near.ax).toBeLessThan(0);
    expect(Math.abs(near.ax)).toBeCloseTo(Math.abs(far.ax) * 4, 5);
  });

  it("is symmetric under rotation of the offset vector", () => {
    const a = acceleration(0, 150);
    const b = acceleration(150, 0);
    expect(Math.hypot(a.ax, a.ay)).toBeCloseTo(Math.hypot(b.ax, b.ay), 10);
  });

  it("stays finite at the origin instead of producing NaN", () => {
    const a = acceleration(0, 0);
    expect(Number.isFinite(a.ax)).toBe(true);
    expect(Number.isFinite(a.ay)).toBe(true);
  });
});

describe("circularOrbitVelocity", () => {
  it("decreases as orbital radius grows", () => {
    expect(circularOrbitVelocity(100)).toBeGreaterThan(circularOrbitVelocity(400));
  });
});

describe("stepSimulation", () => {
  it("conserves specific orbital energy over many steps of a circular orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    let state = { x: r, y: 0, vx: 0, vy: v };
    const startEnergy = specificOrbitalEnergy(state);

    const dt = 0.01;
    for (let i = 0; i < 2000; i++) {
      state = stepSimulation(state, dt);
    }

    const endEnergy = specificOrbitalEnergy(state);
    expect(Math.abs(endEnergy - startEnergy) / Math.abs(startEnergy)).toBeLessThan(0.02);
  });

  it("never produces NaN state, even starting exactly at the singularity", () => {
    const state = stepSimulation({ x: 0, y: 0, vx: 0, vy: 0 }, 0.01);
    expect(Number.isFinite(state.x)).toBe(true);
    expect(Number.isFinite(state.y)).toBe(true);
    expect(Number.isFinite(state.vx)).toBe(true);
    expect(Number.isFinite(state.vy)).toBe(true);
  });
});

describe("classifyOutcome", () => {
  const planetRadius = 40;
  const escapeRadius = 800;

  // classifyOutcome reports the CURRENT state, so a decisive outcome
  // (crash/escape) only shows up once the trajectory has actually crossed
  // the threshold; these helpers step until that happens or steps run out.
  function runUntil(state, dt, maxSteps, isDone) {
    let outcome = classifyOutcome(state, planetRadius, escapeRadius);
    for (let i = 0; i < maxSteps && !isDone(outcome); i++) {
      state = stepSimulation(state, dt);
      outcome = classifyOutcome(state, planetRadius, escapeRadius);
    }
    return outcome;
  }

  it("classifies exactly touching the planet radius as a crash", () => {
    const state = { x: planetRadius, y: 0, vx: 0, vy: 0 };
    expect(classifyOutcome(state, planetRadius, escapeRadius)).toBe("crash");
  });

  it("classifies a slow drop as a crash", () => {
    const state = { x: 100, y: 0, vx: 0, vy: 0.5 };
    const outcome = runUntil(state, 0.02, 5000, (o) => o === "crash");
    expect(outcome).toBe("crash");
  });

  it("classifies a circular-velocity tangential launch as a stable orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    const state = { x: r, y: 0, vx: 0, vy: v };
    expect(classifyOutcome(state, planetRadius, escapeRadius)).toBe("orbit");
  });

  it("classifies a launch above escape velocity as escaping", () => {
    const r = 300;
    const vEsc = circularOrbitVelocity(r) * 2;
    const state = { x: r, y: 0, vx: 0, vy: vEsc };
    const outcome = runUntil(state, 0.02, 20000, (o) => o === "escape");
    expect(outcome).toBe("escape");
  });
});

describe("orbitalElements", () => {
  it("reports apoapsis equal to periapsis for a circular orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    const elements = orbitalElements({ x: r, y: 0, vx: 0, vy: v });
    expect(elements.apoapsis).toBeCloseTo(r, 5);
    expect(elements.periapsis).toBeCloseTo(r, 5);
    expect(elements.eccentricity).toBeCloseTo(0, 5);
  });

  it("gives a period matching Kepler's third law for a circular orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    const elements = orbitalElements({ x: r, y: 0, vx: 0, vy: v });
    const expectedPeriod = (2 * Math.PI * r) / v;
    expect(elements.period).toBeCloseTo(expectedPeriod, 3);
  });

  it("returns null for a hyperbolic (escaping) trajectory", () => {
    const r = 300;
    const vEsc = circularOrbitVelocity(r) * 2;
    expect(orbitalElements({ x: r, y: 0, vx: 0, vy: vEsc })).toBeNull();
  });

  it("returns null for an exactly zero specific orbital energy (parabolic)", () => {
    // gm=2, r=1, v=2 gives energy = v²/2 - gm/r = 2 - 2 = 0 exactly in
    // floating point, sidestepping the rounding noise sqrt-based escape
    // velocity would introduce at this boundary.
    const state = { x: 1, y: 0, vx: 0, vy: 2 };
    expect(specificOrbitalEnergy(state, 2)).toBe(0);
    expect(orbitalElements(state, 2)).toBeNull();
  });

  it("stays bound (non-null) for a velocity just under escape velocity", () => {
    const r = 300;
    const vNearEscape = escapeVelocity(r) * 0.999;
    const elements = orbitalElements({ x: r, y: 0, vx: 0, vy: vNearEscape });
    expect(elements).not.toBeNull();
    expect(elements.eccentricity).toBeLessThan(1);
  });
});
