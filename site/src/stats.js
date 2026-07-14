import { getNumber, setNumber } from "./storage.js";

const ORBIT_COUNT_KEY = "escape-velocity:orbit-count";

export function getOrbitCount(storage) {
  const count = getNumber(ORBIT_COUNT_KEY, 0, storage);
  return count < 0 ? 0 : Math.floor(count);
}

export function incrementOrbitCount(storage) {
  const next = getOrbitCount(storage) + 1;
  setNumber(ORBIT_COUNT_KEY, next, storage);
  return next;
}
