// Thin localStorage wrapper: every call is guarded so a missing/throwing
// storage (private browsing, headless test environment, quota errors)
// degrades to the given fallback instead of crashing the caller.

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

export function getNumber(key, fallback, storage) {
  const s = resolveStorage(storage);
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function setNumber(key, value, storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(key, String(value));
  } catch {
    // storage unavailable or full — the feature degrades gracefully
  }
}

export function getBoolean(key, fallback, storage) {
  const s = resolveStorage(storage);
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function setBoolean(key, value, storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(key, value ? "true" : "false");
  } catch {
    // storage unavailable or full — the feature degrades gracefully
  }
}
