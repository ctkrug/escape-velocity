import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createDebrisBurst, updateParticles, particleOpacity } from "../src/particles.js";

function fixedRandom(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("createDebrisBurst", () => {
  it("spawns the requested particle count, all at the impact point", () => {
    const particles = createDebrisBurst(100, 50, 12, fixedRandom([0.1, 0.5, 0.9]));
    expect(particles).toHaveLength(12);
    for (const p of particles) {
      expect(p.x).toBe(100);
      expect(p.y).toBe(50);
      expect(p.life).toBeGreaterThan(0);
      expect(p.life).toBe(p.maxLife);
    }
  });

  it("defaults to zero particles for count=0", () => {
    expect(createDebrisBurst(0, 0, 0, fixedRandom([0.5]))).toEqual([]);
  });

  it("gives particles nonzero outward velocity", () => {
    const particles = createDebrisBurst(0, 0, 4, fixedRandom([0.25, 0.6, 0.1, 0.8]));
    for (const p of particles) {
      expect(Math.hypot(p.vx, p.vy)).toBeGreaterThan(0);
    }
  });

  it("falls back to a seeded PRNG when no random source is injected", () => {
    const particles = createDebrisBurst(10, 20, 6);
    expect(particles).toHaveLength(6);
    for (const p of particles) {
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);
      expect(Number.isFinite(p.vx)).toBe(true);
      expect(Number.isFinite(p.vy)).toBe(true);
      expect(p.life).toBeGreaterThan(0);
    }
  });
});

describe("updateParticles", () => {
  it("moves particles by velocity * dt and decays life", () => {
    const particles = [{ x: 0, y: 0, vx: 10, vy: 20, life: 1, maxLife: 1 }];
    const next = updateParticles(particles, 0.5);
    expect(next).toHaveLength(1);
    expect(next[0].x).toBeCloseTo(5, 10);
    expect(next[0].y).toBeCloseTo(10, 10);
    expect(next[0].life).toBeCloseTo(0.5, 10);
  });

  it("drops particles whose life has expired", () => {
    const particles = [{ x: 0, y: 0, vx: 0, vy: 0, life: 0.1, maxLife: 1 }];
    const next = updateParticles(particles, 0.5);
    expect(next).toEqual([]);
  });

  it("drops a particle whose life lands exactly on zero", () => {
    const particles = [{ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, maxLife: 1 }];
    const next = updateParticles(particles, 0.5);
    expect(next).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(updateParticles([], 0.016)).toEqual([]);
  });
});

describe("particleOpacity", () => {
  it("is 1 for a freshly spawned particle", () => {
    expect(particleOpacity({ life: 1, maxLife: 1 })).toBe(1);
  });

  it("is 0 for an expired particle", () => {
    expect(particleOpacity({ life: 0, maxLife: 1 })).toBe(0);
  });

  it("interpolates linearly between spawn and expiry", () => {
    expect(particleOpacity({ life: 0.25, maxLife: 1 })).toBeCloseTo(0.25, 10);
  });

  it("guards against a zero maxLife instead of dividing by zero", () => {
    expect(particleOpacity({ life: 0, maxLife: 0 })).toBe(0);
  });
});
