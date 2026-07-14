import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { dragVector, dragDistance, clampToMaxDistance, launchVelocity } from "../src/input.js";

describe("dragVector / dragDistance", () => {
  it("computes the offset from anchor to pointer", () => {
    expect(dragVector({ x: 0, y: 0 }, { x: 3, y: 4 })).toEqual({ dx: 3, dy: 4 });
  });

  it("is zero when the pointer hasn't moved", () => {
    expect(dragVector({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({ dx: 0, dy: 0 });
    expect(dragDistance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });

  it("matches the 3-4-5 triangle", () => {
    expect(dragDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("clampToMaxDistance", () => {
  it("passes the pointer through unchanged when within range", () => {
    const result = clampToMaxDistance({ x: 0, y: 0 }, { x: 3, y: 4 }, 10);
    expect(result).toEqual({ x: 3, y: 4 });
  });

  it("clamps to exactly maxDistance when the pointer overshoots", () => {
    const result = clampToMaxDistance({ x: 0, y: 0 }, { x: 30, y: 40 }, 10);
    expect(result.x).toBeCloseTo(6, 10);
    expect(result.y).toBeCloseTo(8, 10);
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(10, 10);
  });

  it("does not divide by zero when anchor equals pointer", () => {
    const result = clampToMaxDistance({ x: 5, y: 5 }, { x: 5, y: 5 }, 10);
    expect(result).toEqual({ x: 5, y: 5 });
  });

  it("returns the pointer unchanged exactly at the boundary", () => {
    const result = clampToMaxDistance({ x: 0, y: 0 }, { x: 6, y: 8 }, 10);
    expect(result).toEqual({ x: 6, y: 8 });
  });

  it("never returns a point farther than maxDistance from the anchor", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        fc.double({ min: -1e4, max: 1e4, noNaN: true }),
        fc.double({ min: 0.01, max: 1e4, noNaN: true }),
        (ax, ay, px, py, maxDistance) => {
          const anchor = { x: ax, y: ay };
          const pointer = { x: px, y: py };
          const result = clampToMaxDistance(anchor, pointer, maxDistance);
          expect(dragDistance(anchor, result)).toBeLessThanOrEqual(maxDistance + 1e-6);
        }
      )
    );
  });
});

describe("launchVelocity", () => {
  it("scales the drag vector by sensitivity", () => {
    expect(launchVelocity({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5)).toEqual({ vx: 5, vy: 0 });
  });

  it("preserves direction (no slingshot inversion)", () => {
    const v = launchVelocity({ x: 0, y: 0 }, { x: -10, y: 20 }, 1);
    expect(v.vx).toBe(-10);
    expect(v.vy).toBe(20);
  });

  it("is zero velocity for zero drag distance", () => {
    expect(launchVelocity({ x: 5, y: 5 }, { x: 5, y: 5 }, 2)).toEqual({ vx: 0, vy: 0 });
  });
});
