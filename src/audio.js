import { getBoolean, setBoolean } from "./storage.js";

const MUTE_KEY = "escape-velocity:muted";

function tone(audioCtx, { freq, duration, type = "sine", gain = 0.05, sweepTo = null, startOffset = 0 }) {
  const start = audioCtx.currentTime + startOffset;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo !== null) {
    osc.frequency.linearRampToValueAtTime(sweepTo, start + duration);
  }
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function noiseBurst(audioCtx, { duration, gain = 0.06, sweepFreqFrom, sweepFreqTo }) {
  const start = audioCtx.currentTime;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(sweepFreqFrom, start);
  if (sweepFreqTo !== undefined) {
    filter.frequency.linearRampToValueAtTime(sweepFreqTo, start + duration);
  }
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  noise.connect(filter).connect(g).connect(audioCtx.destination);
  noise.start(start);
  noise.stop(start + duration);
}

// Every SFX is synthesized (oscillators/noise), never a loaded audio file.
// The AudioContext is created lazily on the first play call (autoplay
// policies require a user gesture), and every entry point guards for its
// absence so a headless/test environment never throws.
export function createAudioEngine({ AudioContextClass, storage } = {}) {
  const Ctx = AudioContextClass || (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext));
  let ctx = null;
  let muted = getBoolean(MUTE_KEY, false, storage);

  function ensureContext() {
    if (ctx) return ctx;
    if (!Ctx) return null;
    ctx = new Ctx();
    return ctx;
  }

  function play(fn, opts) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    fn(audioCtx, opts);
  }

  return {
    isMuted: () => muted,
    setMuted(value) {
      muted = Boolean(value);
      setBoolean(MUTE_KEY, muted, storage);
    },
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },
    // distanceRatio: 0 (no drag) → 1 (max drag); pitch rises with pull.
    playDragCharge(distanceRatio = 0) {
      play(tone, { freq: 120 + distanceRatio * 260, duration: 0.08, type: "sine", gain: 0.03 });
    },
    playLaunch() {
      play(noiseBurst, { duration: 0.18, sweepFreqFrom: 2200, sweepFreqTo: 400, gain: 0.05 });
    },
    playCrash() {
      play(noiseBurst, { duration: 0.32, sweepFreqFrom: 900, sweepFreqTo: 80, gain: 0.09 });
    },
    playOrbitLock() {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        play(tone, { freq, duration: 0.12, type: "triangle", gain: 0.04, startOffset: i * 0.09 });
      });
    },
    playUiClick() {
      play(tone, { freq: 880, duration: 0.04, type: "square", gain: 0.03 });
    },
  };
}
