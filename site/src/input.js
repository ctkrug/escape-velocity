// Pure geometry for the drag-to-launch gesture: turning a pointer path into
// a launch velocity, shared by the mouse and touch listeners in main.js.

export function dragVector(anchor, pointer) {
  return { dx: pointer.x - anchor.x, dy: pointer.y - anchor.y };
}

export function dragDistance(anchor, pointer) {
  const { dx, dy } = dragVector(anchor, pointer);
  return Math.hypot(dx, dy);
}

// Caps how far the visual indicator/velocity can be dragged so a pointer
// flung off-canvas doesn't launch an absurd, untestable velocity.
export function clampToMaxDistance(anchor, pointer, maxDistance) {
  const { dx, dy } = dragVector(anchor, pointer);
  const distance = Math.hypot(dx, dy);
  if (distance <= maxDistance || distance === 0) return { x: pointer.x, y: pointer.y };
  const scale = maxDistance / distance;
  return { x: anchor.x + dx * scale, y: anchor.y + dy * scale };
}

// Velocity is directly proportional to the drag vector's length and
// direction (see docs/BACKLOG.md 1.3) — no inversion/slingshot reversal.
export function launchVelocity(anchor, pointer, sensitivity) {
  const { dx, dy } = dragVector(anchor, pointer);
  return { vx: dx * sensitivity, vy: dy * sensitivity };
}
