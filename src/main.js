import { DEFAULT_GM, circularOrbitVelocity } from "./physics.js";

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud-readout");

const PLANET_RADIUS = 40;
// Drag-to-launch lands in BUILD; for now the satellite sits at a fixed
// altitude so the scaffold renders something real, physics-backed.
const SATELLITE_START = { x: 220, y: 0 };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  ctx.clearRect(0, 0, rect.width, rect.height);

  const glow = ctx.createRadialGradient(cx, cy, PLANET_RADIUS * 0.4, cx, cy, PLANET_RADIUS * 2.2);
  glow.addColorStop(0, "rgba(77, 216, 232, 0.35)");
  glow.addColorStop(1, "rgba(77, 216, 232, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f1f38";
  ctx.strokeStyle = "#4dd8e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ff6b4a";
  ctx.beginPath();
  ctx.arc(cx + SATELLITE_START.x, cy + SATELLITE_START.y, 6, 0, Math.PI * 2);
  ctx.fill();

  if (hud) {
    const altitude = Math.hypot(SATELLITE_START.x, SATELLITE_START.y);
    const orbitalV = circularOrbitVelocity(altitude, DEFAULT_GM);
    hud.textContent = `circular orbit velocity at this altitude: ${orbitalV.toFixed(2)} u/s`;
  }
}

window.addEventListener("resize", resize);
resize();
