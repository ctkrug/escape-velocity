import { DEFAULT_GM, stepSimulation, classifyOutcome, orbitalElements } from "./physics.js";
import { dragDistance, clampToMaxDistance, launchVelocity } from "./input.js";
import { buildHudReadout } from "./hud.js";
import { createDebrisBurst, updateParticles, particleOpacity } from "./particles.js";
import { createAudioEngine } from "./audio.js";
import { getOrbitCount, incrementOrbitCount } from "./stats.js";

const PLANET_RADIUS = 40;
// The satellite launches from a small standoff above the surface, not the
// surface itself: a tangential orbit starting exactly at PLANET_RADIUS has
// periapsis <= PLANET_RADIUS by construction (see classifyOutcome), which
// makes a genuine "orbit" classification unreachable. The standoff gives a
// real periapsis clearance margin.
const LAUNCH_RADIUS = 60;
const ESCAPE_RADIUS = 500;
const MAX_DRAG_DISTANCE = 220;
const DRAG_SENSITIVITY = 0.09;
const SIM_DT = 1 / 120;
const MAX_FRAME_DT = 0.05;
// Simulated seconds per real second — keeps orbit-lock (2 full periods) and
// escape resolution feeling snappy without touching the physics itself.
const TIME_SCALE = 3;
const MAX_TRACE_POINTS = 4000;
const DRAG_SOUND_THROTTLE_MS = 90;

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const canvasWrap = document.getElementById("canvas-wrap");
const overlay = document.getElementById("outcome-overlay");
const outcomeTitle = document.getElementById("outcome-title");
const outcomeStats = document.getElementById("outcome-stats");
const launchAnotherBtn = document.getElementById("launch-another");
const hudStatus = document.getElementById("hud-status");
const hudOrbitCount = document.getElementById("hud-orbit-count");
const gravitySlider = document.getElementById("gravity-slider");
const gravityValue = document.getElementById("gravity-value");
const muteButton = document.getElementById("mute-toggle");
const resetButton = document.getElementById("reset-button");

const hudFields = {
  velocity: document.getElementById("hud-velocity"),
  altitude: document.getElementById("hud-altitude"),
  apoapsis: document.getElementById("hud-apoapsis"),
  periapsis: document.getElementById("hud-periapsis"),
  period: document.getElementById("hud-period"),
};

const audio = createAudioEngine();

const reducedMotion =
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICON_UNMUTED =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16.5 12a4.5 4.5 0 0 0-2-3.74v7.48A4.5 4.5 0 0 0 16.5 12z"/><path d="M14.5 4.97v2.06a7 7 0 0 1 0 13.94v2.06a9 9 0 0 0 0-18.06z"/></svg>';
const ICON_MUTED =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M19.5 12l2.5-2.5-1-1-2.5 2.5-2.5-2.5-1 1 2.5 2.5-2.5 2.5 1 1 2.5-2.5 2.5 2.5 1-1z"/></svg>';

let gm = DEFAULT_GM;
let phase = "idle"; // idle | dragging | flying | resolved
let satellite = null; // { x, y, vx, vy }
let trace = [];
let particles = [];
let outcome = null; // crash | orbit | escape
let launchSpeed = 0;
let orbitHoldTime = 0;
let orbitLocked = false;
let dragPointer = null; // current pointer position in CSS px, canvas-local
let lastFrameTime = null;
let lastDragSoundTime = 0;
let shakeTimeoutId = null;

function anchorPoint() {
  return { x: LAUNCH_RADIUS, y: 0 };
}

function restingSatellite() {
  return { x: LAUNCH_RADIUS, y: 0, vx: 0, vy: 0 };
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function center() {
  const rect = canvas.getBoundingClientRect();
  return { cx: rect.width / 2, cy: rect.height / 2, width: rect.width, height: rect.height };
}

function toCanvasLocal(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const { cx, cy } = center();
  return { x: clientX - rect.left - cx, y: clientY - rect.top - cy };
}

function setPhase(next) {
  phase = next;
  gravitySlider.disabled = phase === "flying" || phase === "resolved" ? true : false;
}

function resetScene() {
  satellite = restingSatellite();
  trace = [];
  particles = [];
  outcome = null;
  launchSpeed = 0;
  orbitHoldTime = 0;
  orbitLocked = false;
  dragPointer = null;
  overlay.hidden = true;
  hudStatus.textContent = "";
  setPhase("idle");
  render(0);
}

function beginDrag(clientX, clientY) {
  if (phase !== "idle") return;
  setPhase("dragging");
  dragPointer = toCanvasLocal(clientX, clientY);
  lastDragSoundTime = 0;
}

function updateDrag(clientX, clientY) {
  if (phase !== "dragging") return;
  const local = toCanvasLocal(clientX, clientY);
  dragPointer = clampToMaxDistance(anchorPoint(), local, MAX_DRAG_DISTANCE);

  const now = performance.now();
  if (now - lastDragSoundTime > DRAG_SOUND_THROTTLE_MS) {
    const ratio = dragDistance(anchorPoint(), dragPointer) / MAX_DRAG_DISTANCE;
    audio.playDragCharge(ratio);
    lastDragSoundTime = now;
  }
}

function endDrag() {
  if (phase !== "dragging") return;
  const velocity = launchVelocity(anchorPoint(), dragPointer, DRAG_SENSITIVITY);
  launchSatellite(velocity);
}

function launchSatellite(velocity) {
  satellite = { x: LAUNCH_RADIUS, y: 0, vx: velocity.vx, vy: velocity.vy };
  launchSpeed = Math.hypot(velocity.vx, velocity.vy);
  trace = [{ x: satellite.x, y: satellite.y }];
  orbitHoldTime = 0;
  orbitLocked = false;
  dragPointer = null;
  audio.playLaunch();
  setPhase("flying");
}

function pushTracePoint(x, y) {
  trace.push({ x, y });
  if (trace.length > MAX_TRACE_POINTS) trace.shift();
}

function triggerShake() {
  if (reducedMotion) return;
  canvasWrap.classList.remove("is-shaking");
  // force reflow so the animation restarts if triggered again quickly
  void canvasWrap.offsetWidth;
  canvasWrap.classList.add("is-shaking");
  clearTimeout(shakeTimeoutId);
  shakeTimeoutId = setTimeout(() => canvasWrap.classList.remove("is-shaking"), 200);
}

function resolveOutcome(kind) {
  outcome = kind;
  setPhase("resolved");

  if (kind === "crash") {
    if (!reducedMotion) particles = createDebrisBurst(satellite.x, satellite.y);
    triggerShake();
    audio.playCrash();
    hudStatus.textContent = "CRASH";
  } else if (kind === "orbit") {
    audio.playOrbitLock();
    hudOrbitCount.textContent = String(incrementOrbitCount());
    hudStatus.textContent = "ORBIT LOCKED";
  } else if (kind === "escape") {
    audio.playLaunch();
    hudStatus.textContent = "ESCAPED";
  }

  showOverlay(kind);
}

function showOverlay(kind) {
  outcomeTitle.textContent = kind === "crash" ? "CRASH" : kind === "orbit" ? "ORBIT LOCKED" : "ESCAPED";
  outcomeTitle.dataset.outcome = kind;

  const stats = [["launch velocity", `${launchSpeed.toFixed(2)} u/s`]];
  if (kind === "orbit" && satellite) {
    const elements = orbitalElements(satellite, gm);
    if (elements) {
      stats.push(["apoapsis", `${elements.apoapsis.toFixed(1)} u`]);
      stats.push(["periapsis", `${elements.periapsis.toFixed(1)} u`]);
      stats.push(["period", `${elements.period.toFixed(2)} s`]);
    }
  } else if (satellite) {
    const altitude = Math.hypot(satellite.x, satellite.y) - PLANET_RADIUS;
    stats.push(["altitude", `${altitude.toFixed(1)} u`]);
  }

  outcomeStats.innerHTML = stats.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");
  overlay.hidden = false;
}

function stepPhysics(dt) {
  let remaining = dt;
  while (remaining > 0 && phase === "flying") {
    const step = Math.min(SIM_DT, remaining);
    satellite = stepSimulation(satellite, step, gm);
    remaining -= step;
    pushTracePoint(satellite.x, satellite.y);

    const classification = classifyOutcome(satellite, PLANET_RADIUS, ESCAPE_RADIUS, gm);
    if (classification === "crash" || classification === "escape") {
      resolveOutcome(classification);
      return;
    }

    if (classification === "orbit") {
      orbitHoldTime += step;
      const elements = orbitalElements(satellite, gm);
      if (elements && orbitHoldTime >= elements.period * 2) {
        orbitLocked = true;
        resolveOutcome("orbit");
        return;
      }
    } else {
      orbitHoldTime = 0;
    }
  }
}

function updateHud() {
  const readout = buildHudReadout(satellite, gm, PLANET_RADIUS);
  hudFields.velocity.textContent = readout.velocity;
  hudFields.altitude.textContent = readout.altitude;
  hudFields.apoapsis.textContent = readout.apoapsis;
  hudFields.periapsis.textContent = readout.periapsis;
  hudFields.period.textContent = readout.period;
}

function drawGrid(width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(77, 216, 232, 0.08)";
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLaunchPad(cx, cy) {
  if (phase !== "idle" && phase !== "dragging") return;
  ctx.save();
  ctx.strokeStyle = "rgba(77, 216, 232, 0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.arc(cx, cy, LAUNCH_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(cx, cy) {
  const glow = ctx.createRadialGradient(cx, cy, PLANET_RADIUS * 0.4, cx, cy, PLANET_RADIUS * 2.2);
  const rimColor = outcome === "crash" ? "255, 82, 82" : "77, 216, 232";
  glow.addColorStop(0, `rgba(${rimColor}, 0.35)`);
  glow.addColorStop(1, `rgba(${rimColor}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f1f38";
  ctx.strokeStyle = outcome === "crash" ? "#ff5252" : "#4dd8e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, PLANET_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTrace(cx, cy) {
  if (trace.length < 2) return;
  ctx.save();
  ctx.strokeStyle = outcome === "orbit" ? "rgba(94, 235, 176, 0.8)" : "rgba(255, 107, 74, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  trace.forEach((point, i) => {
    const x = cx + point.x;
    const y = cy + point.y;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawOrbitLockRing(cx, cy) {
  if (!orbitLocked || !satellite) return;
  const elements = orbitalElements(satellite, gm);
  if (!elements) return;
  const pulse = reducedMotion ? 0.6 : 0.5 + 0.4 * Math.sin(performance.now() / 220);
  ctx.save();
  ctx.strokeStyle = `rgba(94, 235, 176, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(94, 235, 176, 0.6)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(cx, cy, elements.apoapsis, elements.apoapsis * 0.94, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSatellite(cx, cy) {
  if (!satellite) return;
  ctx.fillStyle = "#ff6b4a";
  ctx.beginPath();
  ctx.arc(cx + satellite.x, cy + satellite.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(cx, cy) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = particleOpacity(p);
    ctx.fillStyle = "#ff5252";
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawDragIndicator(cx, cy) {
  if (phase !== "dragging" || !dragPointer) return;
  const anchor = anchorPoint();
  ctx.save();
  ctx.strokeStyle = "#4dd8e8";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cx + anchor.x, cy + anchor.y);
  ctx.lineTo(cx + dragPointer.x, cy + dragPointer.y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "#ff6b4a";
  ctx.beginPath();
  ctx.arc(cx + dragPointer.x, cy + dragPointer.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  const { cx, cy, width, height } = center();
  ctx.clearRect(0, 0, width, height);
  drawGrid(width, height);
  drawTrace(cx, cy);
  drawOrbitLockRing(cx, cy);
  drawPlanet(cx, cy);
  drawLaunchPad(cx, cy);
  drawParticles(cx, cy);
  drawDragIndicator(cx, cy);
  drawSatellite(cx, cy);
  updateHud();
}

function frame(timestamp) {
  if (lastFrameTime === null) lastFrameTime = timestamp;
  const rawDt = Math.min(MAX_FRAME_DT, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;
  const dt = rawDt * TIME_SCALE;

  if (phase === "flying") {
    stepPhysics(dt);
  }
  if (!reducedMotion && particles.length) {
    particles = updateParticles(particles, dt);
  }

  render();
  requestAnimationFrame(frame);
}

function updateMuteButton() {
  const muted = audio.isMuted();
  muteButton.innerHTML = muted ? ICON_MUTED : ICON_UNMUTED;
  muteButton.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  muteButton.setAttribute("aria-pressed", String(muted));
}

function wireControls() {
  canvas.addEventListener("mousedown", (e) => beginDrag(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => updateDrag(e.clientX, e.clientY));
  window.addEventListener("mouseup", endDrag);

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const t = e.touches[0];
      beginDrag(t.clientX, t.clientY);
    },
    { passive: false }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (phase !== "dragging") return;
      e.preventDefault();
      const t = e.touches[0];
      updateDrag(t.clientX, t.clientY);
    },
    { passive: false }
  );
  window.addEventListener("touchend", endDrag);
  window.addEventListener("touchcancel", endDrag);

  gravitySlider.addEventListener("input", () => {
    gm = Number(gravitySlider.value);
    gravityValue.textContent = gravitySlider.value;
    if (phase === "idle") render();
  });

  muteButton.addEventListener("click", () => {
    audio.toggleMute();
    updateMuteButton();
    if (!audio.isMuted()) audio.playUiClick();
  });

  resetButton.addEventListener("click", () => {
    audio.playUiClick();
    resetScene();
  });

  launchAnotherBtn.addEventListener("click", () => {
    audio.playUiClick();
    resetScene();
  });

  window.addEventListener("resize", () => {
    resize();
    render();
  });
}

hudOrbitCount.textContent = String(getOrbitCount());
gravityValue.textContent = String(gm);
resize();
wireControls();
updateMuteButton();
resetScene();
requestAnimationFrame(frame);
