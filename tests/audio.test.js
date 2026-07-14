import { describe, it, expect } from "vitest";
import { createAudioEngine } from "../src/audio.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

// Minimal WebAudio double: enough surface for audio.js's tone()/noiseBurst()
// to run without throwing, plus a counter so tests can assert call shape.
function makeFakeAudioContextClass() {
  const calls = { oscillators: 0, buffers: 0 };
  class FakeParam {
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }
  class FakeNode {
    constructor() {
      this.frequency = new FakeParam();
      this.gain = new FakeParam();
    }
    connect() {
      return this;
    }
    start() {}
    stop() {}
  }
  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = {};
    }
    createOscillator() {
      calls.oscillators++;
      return new FakeNode();
    }
    createGain() {
      return new FakeNode();
    }
    createBufferSource() {
      calls.buffers++;
      const node = new FakeNode();
      node.buffer = null;
      return node;
    }
    createBuffer(_channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBiquadFilter() {
      return new FakeNode();
    }
  }
  return { FakeAudioContext, calls };
}

describe("createAudioEngine — no AudioContext available", () => {
  it("never throws when playing any SFX without a constructor", () => {
    const engine = createAudioEngine({ AudioContextClass: undefined, storage: fakeStorage() });
    expect(() => {
      engine.playDragCharge(0.5);
      engine.playLaunch();
      engine.playCrash();
      engine.playOrbitLock();
      engine.playUiClick();
    }).not.toThrow();
  });
});

describe("createAudioEngine — mute", () => {
  it("defaults to unmuted", () => {
    const engine = createAudioEngine({ storage: fakeStorage() });
    expect(engine.isMuted()).toBe(false);
  });

  it("suppresses all sound synthesis while muted", () => {
    const { FakeAudioContext, calls } = makeFakeAudioContextClass();
    const engine = createAudioEngine({ AudioContextClass: FakeAudioContext, storage: fakeStorage() });
    engine.setMuted(true);
    engine.playLaunch();
    engine.playCrash();
    expect(calls.oscillators).toBe(0);
    expect(calls.buffers).toBe(0);
  });

  it("plays sound again once unmuted", () => {
    const { FakeAudioContext, calls } = makeFakeAudioContextClass();
    const engine = createAudioEngine({ AudioContextClass: FakeAudioContext, storage: fakeStorage() });
    engine.setMuted(true);
    engine.setMuted(false);
    engine.playUiClick();
    expect(calls.oscillators).toBe(1);
  });

  it("toggleMute flips state and returns the new value", () => {
    const engine = createAudioEngine({ storage: fakeStorage() });
    expect(engine.toggleMute()).toBe(true);
    expect(engine.toggleMute()).toBe(false);
  });

  it("persists mute state across engine instances via storage", () => {
    const storage = fakeStorage();
    const first = createAudioEngine({ storage });
    first.setMuted(true);
    const second = createAudioEngine({ storage });
    expect(second.isMuted()).toBe(true);
  });
});

describe("createAudioEngine — playback shape", () => {
  it("schedules three oscillators for the orbit-lock chime", () => {
    const { FakeAudioContext, calls } = makeFakeAudioContextClass();
    const engine = createAudioEngine({ AudioContextClass: FakeAudioContext, storage: fakeStorage() });
    engine.playOrbitLock();
    expect(calls.oscillators).toBe(3);
  });

  it("uses a noise burst (buffer source) for launch and crash", () => {
    const { FakeAudioContext, calls } = makeFakeAudioContextClass();
    const engine = createAudioEngine({ AudioContextClass: FakeAudioContext, storage: fakeStorage() });
    engine.playLaunch();
    engine.playCrash();
    expect(calls.buffers).toBe(2);
  });

  it("reuses a single lazily-created AudioContext across calls", () => {
    let constructed = 0;
    class CountingContext {
      constructor() {
        constructed++;
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = {};
      }
      createOscillator() {
        return { frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect: () => {} }), start() {}, stop() {} };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({}) };
      }
    }
    const engine = createAudioEngine({ AudioContextClass: CountingContext, storage: fakeStorage() });
    engine.playUiClick();
    engine.playUiClick();
    expect(constructed).toBe(1);
  });
});
