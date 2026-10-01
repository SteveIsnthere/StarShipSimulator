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
import {
  clampVolume,
  createAudioEngine,
  DEFAULT_VOLUME,
  MUTE_KEY,
  readMuted,
  readVolume,
  VOLUME_KEY,
  writeMuted,
  writeVolume,
} from '$audio/engine';
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
    /*
      And the master gain is untouched: this is not a gain trick.

      Compared against the LEVEL rather than against 1, since M12.5 gave the
      master a level to sit at. The claim is the same one — muting does not
      quieten, it suspends — and this is now the sharper way to say it: the gain
      is exactly where the settings left it, whatever that is.
    */
    expect(engine.mixer!.master.gain.value).toBe(engine.volume);
    expect(engine.volume).toBe(DEFAULT_VOLUME);
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

describe('the level reaches the master gain (M12.5)', () => {
  it('leaves the shipped mix exactly where M8.5 tuned it', () => {
    /*
      PINNED, because it is the one number in this feature that can go wrong
      silently. The four bus gains were balanced against a master of 1.0; a
      default of anything less ships a quieter mix than the one that was mixed,
      and nothing else in the suite would notice. If this line is ever changed,
      it should be because someone re-mixed on purpose.
    */
    expect(DEFAULT_VOLUME).toBe(1);
  });

  it('a fresh profile starts at the default and puts it on the node', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    expect(engine.volume).toBe(DEFAULT_VOLUME);
    await engine.unlock();
    // THE POINT OF THE TASK, as one assertion: a settings control that does not
    // reach the mixer is a settings control that does nothing.
    expect(engine.mixer!.master.gain.value).toBe(DEFAULT_VOLUME);
  });

  it('a remembered level is on the node the moment the graph exists', async () => {
    const storage = workingStorage();
    writeVolume(0.25, storage);
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage,
    });
    expect(engine.volume).toBe(0.25);
    await engine.unlock();
    expect(engine.mixer!.master.gain.value).toBe(0.25);
  });

  it('and a change lands on a graph that is already running', async () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    engine.setVolume(0.4);
    expect(engine.mixer!.master.gain.value).toBe(0.4);
    expect(engine.volume).toBe(0.4);
  });

  it('a level set before the first gesture is not lost', () => {
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    // No unlock: there is no graph to write to, and the autoplay policy says
    // there must not be one. The level still has to survive to the gesture.
    engine.setVolume(0.1);
    expect(engine.volume).toBe(0.1);
    expect(engine.mixer).toBeNull();
  });

  it('is remembered across a reload', () => {
    const storage = workingStorage();
    const context = fakeContext();
    createAudioEngine({ host: { create: () => context as never }, storage }).setVolume(0.33);
    const second = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage,
    });
    expect(second.volume).toBe(0.33);
  });

  it('and zero is a level, not a mute', async () => {
    /*
      The distinction the interface comment argues for, asserted rather than
      described. Mute SUSPENDS the context; a level of zero leaves it running
      and silent. Collapsing the two would make the switch unreachable from the
      slider's own end and would quietly change what "muted" means to every
      other test in this file.
    */
    const context = fakeContext();
    const engine = createAudioEngine({
      host: { create: () => context as never },
      storage: workingStorage(),
    });
    await engine.unlock();
    engine.setVolume(0);
    expect(engine.mixer!.master.gain.value).toBe(0);
    expect(engine.muted).toBe(false);
    expect(engine.state).toBe('running');
  });

  it('clamps anything a slider or a storage can produce', () => {
    expect(clampVolume(-3)).toBe(0);
    expect(clampVolume(40)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_VOLUME);
    expect(clampVolume(0.5)).toBe(0.5);
  });

  it('and reads a corrupted or absent stored level as the default', () => {
    const storage = workingStorage();
    expect(readVolume(storage)).toBe(DEFAULT_VOLUME);
    storage.setItem(VOLUME_KEY, 'loud');
    expect(readVolume(storage)).toBe(DEFAULT_VOLUME);
    storage.setItem(VOLUME_KEY, '9');
    expect(readVolume(storage)).toBe(1);
    storage.setItem(VOLUME_KEY, '-1');
    expect(readVolume(storage)).toBe(0);
    // AND AN EMPTY STRING IS ABSENT, not zero. `Number('')` is 0, a perfectly
    // valid level, so without this a key written empty comes back as a
    // simulator that is silent while its Sound switch reports on.
    storage.setItem(VOLUME_KEY, '');
    expect(readVolume(storage)).toBe(DEFAULT_VOLUME);
    storage.setItem(VOLUME_KEY, '   ');
    expect(readVolume(storage)).toBe(DEFAULT_VOLUME);
    // Zero itself still reads as zero: it is a level.
    storage.setItem(VOLUME_KEY, '0');
    expect(readVolume(storage)).toBe(0);
  });

  it('does not write on every pixel of a drag', () => {
    /*
      `localStorage.setItem` is synchronous and an `oninput` fires on every step
      of a slider's travel. The gain still moves on each one — the sound follows
      the finger — but only the commit is remembered.
    */
    const writes: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: (_k: string, v: string) => void writes.push(v),
    };
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage,
    });
    for (const level of [0.9, 0.8, 0.7, 0.6]) engine.setVolume(level, { remember: false });
    expect(writes, 'a drag in progress writes nothing').toEqual([]);
    expect(engine.volume, 'but the level still moved').toBe(0.6);
    engine.setVolume(0.6);
    expect(writes, 'and letting go writes once').toEqual(['0.6']);
  });

  it('and a storage that throws costs the level nothing for this session', () => {
    expect(() => readVolume(hostileStorage)).not.toThrow();
    expect(readVolume(hostileStorage)).toBe(DEFAULT_VOLUME);
    const engine = createAudioEngine({
      host: { create: () => fakeContext() as never },
      storage: hostileStorage,
    });
    expect(() => engine.setVolume(0.2)).not.toThrow();
    expect(engine.volume).toBe(0.2);
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
