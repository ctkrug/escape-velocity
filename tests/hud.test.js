import { describe, it, expect } from "vitest";
import { buildHudReadout } from "../src/hud.js";
import { circularOrbitVelocity, DEFAULT_GM } from "../src/physics.js";

const PLANET_RADIUS = 40;

describe("buildHudReadout", () => {
  it("formats velocity and altitude with units for a live orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    const readout = buildHudReadout({ x: r, y: 0, vx: 0, vy: v }, DEFAULT_GM, PLANET_RADIUS);
    expect(readout.velocity).toBe(`${v.toFixed(2)} u/s`);
    expect(readout.altitude).toBe(`${(r - PLANET_RADIUS).toFixed(1)} u`);
  });

  it("reports apoapsis/periapsis/period for a bound orbit", () => {
    const r = 300;
    const v = circularOrbitVelocity(r);
    const readout = buildHudReadout({ x: r, y: 0, vx: 0, vy: v }, DEFAULT_GM, PLANET_RADIUS);
    expect(readout.apoapsis).not.toBe("—");
    expect(readout.periapsis).not.toBe("—");
    expect(readout.period).not.toBe("—");
  });

  it("never renders NaN/undefined at t=0 (zero velocity at launch pad)", () => {
    const readout = buildHudReadout({ x: 300, y: 0, vx: 0, vy: 0 }, DEFAULT_GM, PLANET_RADIUS);
    for (const value of Object.values(readout)) {
      expect(value).not.toMatch(/NaN|undefined/);
    }
    expect(readout.velocity).toBe("0.00 u/s");
  });

  it("shows placeholders instead of NaN immediately after a crash (r=0)", () => {
    const readout = buildHudReadout({ x: 0, y: 0, vx: 0, vy: 0 }, DEFAULT_GM, PLANET_RADIUS);
    expect(readout.velocity).toBe("0.00 u/s");
    expect(readout.altitude).not.toMatch(/NaN/);
  });

  it("shows a placeholder for apoapsis/period on an escaping (hyperbolic) trajectory", () => {
    const r = 300;
    const vEsc = circularOrbitVelocity(r) * 2;
    const readout = buildHudReadout({ x: r, y: 0, vx: 0, vy: vEsc }, DEFAULT_GM, PLANET_RADIUS);
    expect(readout.apoapsis).toBe("—");
    expect(readout.period).toBe("—");
  });

  it("handles a missing state gracefully (no state before first render)", () => {
    const readout = buildHudReadout(null, DEFAULT_GM, PLANET_RADIUS);
    expect(readout.velocity).toBe("—");
  });
});
