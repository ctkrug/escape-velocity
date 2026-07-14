// Pure debris-particle simulation for the crash outcome's "puff of debris".
// Kept independent of canvas drawing so the burst/update math is testable
// without a DOM.

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `random` is injectable so tests get deterministic bursts; defaults to a
// seeded PRNG (not Math.random) so bursts are reproducible across runs too.
export function createDebrisBurst(x, y, count = 18, random = mulberry32(Date.now() | 0)) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const speed = 40 + random() * 90;
    const life = 0.4 + random() * 0.35;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
    });
  }
  return particles;
}

// Advances every particle by dt and drops any whose life has expired.
export function updateParticles(particles, dt) {
  const next = [];
  for (const p of particles) {
    const life = p.life - dt;
    if (life <= 0) continue;
    next.push({
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx,
      vy: p.vy,
      life,
      maxLife: p.maxLife,
    });
  }
  return next;
}

// 1 (just spawned) → 0 (about to expire); drives fade-out opacity.
export function particleOpacity(particle) {
  if (particle.maxLife <= 0) return 0;
  return Math.max(0, Math.min(1, particle.life / particle.maxLife));
}
