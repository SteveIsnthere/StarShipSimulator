/**
 * M8.1: the audio layer's plumbing.
 *
 * WHAT CAN BE TESTED ABOUT SOUND, which is the interesting problem here and the
 * one SOUND-PLAN § 6 sets out deliberately rather than hoping for. Headless
 * browsers make no noise and no CI checks a mix, so the claims have to be
 * chosen: the graph is built once, the unlock respects the autoplay policy, mute
 * SUSPENDS rather than quietens, and a browser that throws on storage does not
 * take the simulator down with it.
 *
 * None of that is "does it sound good". § 6 says so out loud rather than
 * pretending otherwise, and so does the M8.5 acceptance line.
 */
import { describe, expect, it, vi } from 'vitest';
import { createAudioEngine, MUTE_KEY, readMuted, writeMuted } from '$audio/engine';
import { BUSES, BUS_GAIN, createMixer, createNoiseBuffer, NOISE_SECONDS } from '$audio/graph';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';

/**
 * A minimal stand-in for an AudioContext.
 *
 * Counts every node it hands out, which is what makes "the graph is built once"
 * an assertion — the audio version of the M3.7 leak test that would have caught
 * the 2021 particle leak.
 */
function fakeContext() {
  let created = 0;
  /**
   * One node, with AudioParams that record rather than ramp.
   *
   * `setTargetAtTime` is here because the voices use it — a gain that jumps
   * clicks — and a stub without it fails with a TypeError the moment a real
   * voice is driven through it. Worth noting that is a STUB gap rather than a
   * product bug: the same code renders correctly under the real
   * `OfflineAudioContext` in render.test.ts, which is why both kinds of test
   * exist.
   */
  const param = () => ({
    value: 0,
    setTargetAtTime(v: number) {
      this.value = v;
    },
    setValueAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
    cancelScheduledValues() {},
  });
  const node = () => {
    created += 1;
    return {
      gain: param(),
      frequency: param(),
      Q: param(),
      detune: param(),
      type: '',
      buffer: null as unknown,
      loop: false,
      onended: null as (() => void) | null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  };
  const ctx = {
    sampleRate: 48_000,
    currentTime: 0,
    state: 'suspended',
    destination: node(),
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createOscillator: node,
    createBuffer: (channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length),
    }),
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    suspend: vi.fn(async () => {
      ctx.state = 'suspended';
    }),
    close: vi.fn(async () => {
      ctx.state = 'closed';
    }),
    get nodesCreated() {
      return created;
    },
  };
  return ctx;
}

/** A storage that works, and one that throws on every access. */
const workingStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};
const hostileStorage = {
  getItem: () => {
    throw new Error('site data blocked');
  },
  setItem: () => {
    throw new Error('site data blocked');
  },
};

describe('the graph is built once', () => {
  it('creates a master and one gain per bus, and no more', () => {
    const context = fakeContext();
    const before = context.nodesCreated;
    const mixer = createMixer(context as never);
    expect(context.nodesCreated - before).toBe(BUSES.length + 1);
    expect(mixer.nodeCount).toBe(BUSES.length + 1);
  });

  it('gives every named bus a distinct gain node at its documented level', () => {
    const mixer = createMixer(fakeContext() as never);
    const seen = new Set<unknown>();
    for (const name of BUSES) {
      const bus = mixer.bus(name);
      expect(bus, name).toBeDefined();
      expect(bus.gain.value, name).toBe(BUS_GAIN[name]);
      seen.add(bus);
    }
    // Distinct, or a mix pass could not move one without moving the others.
    expect(seen.size).toBe(BUSES.length);
  });

  it('unlocking twice does not build a second graph', () => {
    /*
      The claim that matters most. `unlock` is called on EVERY gesture, because
      the browser requires a gesture and does not mind being told twice — so the
      one thing it must never do is build another context.
    */
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    return (async () => {
      await engine.unlock();
      const after = context.nodesCreated;
      for (let i = 0; i < 50; i++) await engine.unlock();
      expect(context.nodesCreated).toBe(after);
    })();
  });
});

describe('the unlock respects the autoplay policy', () => {
  it('constructs nothing at all until the first gesture', () => {
    // Lazy, so the audio layer cannot reach the first-load critical path even
    // by accident.
    const create = vi.fn(() => fakeContext() as never);
    const engine = createAudioEngine({ host: { create }, storage: workingStorage() });
    expect(create).not.toHaveBeenCalled();
    expect(engine.state).toBe('idle');
    expect(engine.mixer).toBeNull();
  });

  it('reaches running after a gesture', async () => {
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    expect(engine.state).toBe('running');
    expect(engine.mixer).not.toBeNull();
    expect(engine.noise).not.toBeNull();
  });

  it('a gesture does NOT start audio someone switched off', async () => {
    // Muted means muted. The intro is silent by design until the first
    // interaction; that must not become "silent until the first interaction,
    // and then loud despite the switch".
    const create = vi.fn(() => fakeContext() as never);
    const engine = createAudioEngine({
      host: { create },
      storage: workingStorage(),
      muted: true,
    });
    await engine.unlock();
    expect(create).not.toHaveBeenCalled();
    expect(engine.state).toBe('idle');
  });
});

describe('mute suspends rather than quietens', () => {
  it('suspends the context, so a muted simulator does no audio work', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    await engine.setMuted(true);
    expect(context.suspend).toHaveBeenCalled();
    expect(engine.state).toBe('suspended');
    // And the master gain is untouched: this is not a gain trick.
    expect(engine.mixer!.master.gain.value).toBe(1);
  });

  it('resumes on unmute', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    await engine.setMuted(true);
    await engine.setMuted(false);
    expect(engine.state).toBe('running');
  });

  it('remembers the choice', async () => {
    const storage = workingStorage();
    const engine = createAudioEngine({ host: { create: () => fakeContext() as never }, storage });
    await engine.setMuted(true);
    expect(storage.getItem(MUTE_KEY)).toBe('1');
    // A fresh engine, as a reload would build.
    const next = createAudioEngine({ host: { create: () => fakeContext() as never }, storage });
    expect(next.muted).toBe(true);
  });
});

describe('a browser that refuses storage does not take the simulator down', () => {
  it('reads and writes without throwing', () => {
    // The M6.4 lesson: site data blocked THROWS on access rather than returning
    // null, and a simulator that will not start because it could not remember a
    // preference would be a poor trade.
    expect(() => readMuted(hostileStorage)).not.toThrow();
    expect(readMuted(hostileStorage)).toBe(false);
    expect(() => writeMuted(true, hostileStorage)).not.toThrow();
  });

  it('and the engine still mutes for the session', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: hostileStorage,
    });
    await engine.unlock();
    await engine.setMuted(true);
    expect(engine.muted).toBe(true);
    expect(engine.state).toBe('suspended');
  });
});

describe('the noise buffer', () => {
  it('is generated rather than shipped, and is the documented length', () => {
    // § 3.1's whole argument: a rumble loop long enough not to sound looped
    // costs hundreds of kB. This costs zero bytes on the wire.
    const context = fakeContext();
    const buffer = createNoiseBuffer(context as never);
    expect(buffer.length).toBe(48_000 * NOISE_SECONDS);
    expect(buffer.sampleRate).toBe(48_000);
  });

  it('is deterministic, so an OfflineAudioContext render is reproducible', () => {
    // Same reasoning as M7.6's cloud deck: not because the sim needs it, but so
    // a test comparing two renders is comparing the thing it means to.
    const a = createNoiseBuffer(fakeContext() as never, 12345);
    const b = createNoiseBuffer(fakeContext() as never, 12345);
    expect(Array.from(a.getChannelData(0).slice(0, 32))).toEqual(
      Array.from(b.getChannelData(0).slice(0, 32)),
    );
  });
});

describe('destroy', () => {
  it('closes the context and drops the graph', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    await engine.destroy();
    expect(context.close).toHaveBeenCalled();
    expect(engine.mixer).toBeNull();
    expect(engine.state).toBe('idle');
  });
});

describe('the engine drives its voices from the tick (M8.2)', () => {
  const state = () => {
    const s = createScenarioState(getScenario('landing-burn')!);
    return s;
  };

  it('costs one comparison before the first gesture', () => {
    // The frame path must not pay for a feature that is not running. This is
    // called every frame from the moment the page loads, and for the first
    // twenty seconds of every session there is no context at all.
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
    });
    engine.update(state());
    expect(engine.lastWriteCount).toBe(0);
  });

  it('costs one comparison while muted', async () => {
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    await engine.setMuted(true);
    engine.update(state());
    expect(engine.lastWriteCount).toBe(0);
  });

  it('builds its voices once, however many gestures arrive', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    const afterFirst = context.nodesCreated;
    for (let i = 0; i < 20; i++) await engine.unlock();
    expect(context.nodesCreated).toBe(afterFirst);
  });

  it('writes when the flight changes and not when it repeats', async () => {
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
    });
    await engine.unlock();

    let s = state();
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 600; i++) s = step(s, 1 / 120);

    engine.update(s);
    const first = engine.lastWriteCount;
    expect(first).toBeGreaterThan(0);

    // The same state again: nothing moved, so nothing is written. An AudioParam
    // set to the value it already holds is a wasted call, and one per parameter
    // per frame at 120 Hz is how a Web Audio graph starts stuttering.
    engine.update(s);
    expect(engine.lastWriteCount).toBe(0);
  });
});

describe('transients reach the bank through the engine (M8.4)', () => {
  it('fires on a real flight, and a reset re-arms it', async () => {
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
    });
    await engine.unlock();

    const fly = () => {
      let s = createScenarioState(getScenario('landing-burn')!);
      cmd.toggleAutoLand(s);
      for (let i = 0; i < 120 * 60; i++) {
        s = step(s, 1 / 120);
        engine.update(s);
        if (s.status.landed) break;
      }
    };

    fly();
    const first = engine.transientCount;
    expect(first).toBeGreaterThan(0);

    // Without a reset the latches are spent: the second flight's touchdown
    // would be swallowed. `resetFlight` is what App.svelte calls on Configure.
    engine.resetFlight();
    fly();
    expect(engine.transientCount).toBeGreaterThan(first);
  });

  it('fires nothing while muted', async () => {
    // Muted means no audio work at all, including one-shots.
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: workingStorage(),
      muted: true,
    });
    await engine.unlock();
    let s = createScenarioState(getScenario('landing-burn')!);
    cmd.toggleAutoLand(s);
    for (let i = 0; i < 120 * 30; i++) {
      s = step(s, 1 / 120);
      engine.update(s);
    }
    expect(engine.transientCount).toBe(0);
  });
});
