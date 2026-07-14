import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getOrbitCount, incrementOrbitCount } from "../src/stats.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

describe("getOrbitCount", () => {
  it("defaults to 0 with no prior stat", () => {
    expect(getOrbitCount(fakeStorage())).toBe(0);
  });

  it("reads a previously stored count", () => {
    expect(getOrbitCount(fakeStorage({ "escape-velocity:orbit-count": "5" }))).toBe(5);
  });

  it("clamps a negative stored value to 0", () => {
    expect(getOrbitCount(fakeStorage({ "escape-velocity:orbit-count": "-3" }))).toBe(0);
  });

  it("floors a non-integer stored value", () => {
    expect(getOrbitCount(fakeStorage({ "escape-velocity:orbit-count": "4.7" }))).toBe(4);
  });
});

describe("incrementOrbitCount", () => {
  it("increments from 0 to 1 on first orbit", () => {
    const storage = fakeStorage();
    expect(incrementOrbitCount(storage)).toBe(1);
    expect(getOrbitCount(storage)).toBe(1);
  });

  it("persists across repeated increments", () => {
    const storage = fakeStorage();
    incrementOrbitCount(storage);
    incrementOrbitCount(storage);
    expect(incrementOrbitCount(storage)).toBe(3);
  });

  it("survives a simulated reload (fresh read reflects the write)", () => {
    const storage = fakeStorage();
    incrementOrbitCount(storage);
    const reloaded = getOrbitCount(storage);
    expect(reloaded).toBe(1);
  });
});
