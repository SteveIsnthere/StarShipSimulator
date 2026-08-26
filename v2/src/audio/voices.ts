/**
 * The voices: Web Audio graphs that turn `AudioParams` into sound.
 *
 * SYNTHESIS, NOT SAMPLES, and SOUND-PLAN § 3.1 is the argument. The continuous
 * sounds here are all filtered noise with a parameter that moves, which is three
 * nodes — and that has properties a sample loop cannot match:
 *
 *   It is a FUNCTION OF SIMSTATE, exactly like every readout in `hud/`. Throttle
 *   moves, the timbre moves, continuously, with no crossfade between a "low"
 *   loop and a "high" loop.
 *
 *   It costs NO BYTES. A rumble loop long enough not to sound looped is hundreds
 *   of kB; this is a few lines and the audio budget still reads 0.0 kB.
 *
 *   It is TESTABLE, because the parameters are pure functions living next door
 *   in params.ts and the graph itself renders under `OfflineAudioContext`.
 *
 * ONE SUBSCRIBER, DIFFED BEFORE WRITING — the same law as every binder in
 * `hud/`, for a sharper reason here: an AudioParam set to the value it already
 * holds is a wasted call, and a `setTargetAtTime` per parameter per frame at
 * 120 Hz is how a Web Audio graph starts stuttering (§ 6).
 */
import type { AudioGraphContext, Mixer } from './graph';
import { ENGINE_SUB_HZ, type AudioParams } from './params';

/**
 * s — the time constant every parameter change is smoothed over.
 *
 * `setTargetAtTime` rather than `setValueAtTime`, because a gain that jumps
 * clicks. 40 ms is fast enough that a throttle-up feels immediate and slow
 * enough that nothing zippers.
 */
export const SMOOTH_SECONDS = 0.04;

export interface Voice {
  /** Push a frame's parameters. Writes only what moved. */
  update(params: AudioParams): void;
  /** AudioParam writes performed by the last update. */
  readonly lastWriteCount: number;
  readonly totalWrites: number;
  /** Nodes this voice created. Fixed at construction — see the leak test. */
  readonly nodeCount: number;
  stop(): void;
}

export interface EngineVoiceOptions {
  context: AudioGraphContext;
  mixer: Mixer;
  /** The shared looping noise buffer, built once with the graph. */
  noise: AudioBuffer;
}

/**
 * The engine: filtered noise, plus a sub-oscillator under it.
 *
 *   noise -> lowpass ---\
 *                        +--> gain -> engine bus
 *   sub oscillator -----/
 *
 * The noise is the plume; the oscillator is the vehicle it is bolted to. Both
 * are needed — noise alone is a hiss and a tone alone is a hum, and the thing
 * a rocket sounds like is a big object being shaken by an enormous hiss.
 */
export function createEngineVoice(options: EngineVoiceOptions): Voice {
  const { context, mixer, noise } = options;

  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.9;

  const sub = context.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = ENGINE_SUB_HZ;

  /*
    The sub sits under the noise at a FIXED ratio, and this constant is the
    whole of it: `subGain` feeds `gain`, which already applies the level, so
    anything level-dependent here would be applied twice.

    That is not a hypothetical. The first version set this to `level * 0.33` on
    every update, which made the sub scale as the SQUARE of the level — and the
    OfflineAudioContext render caught it as an arithmetic discrepancy nobody
    would have heard as a bug: the vacuum fade measured 0.106 of sea level where
    the documented floor is 0.22, because the noise path was fading linearly
    while the sub faded quadratically underneath it. A throttle-down would have
    lost its bottom end far faster than intended.
  */
  const subGain = context.createGain();
  subGain.gain.value = 0.33;

  const gain = context.createGain();
  gain.gain.value = 0;

  source.connect(filter);
  filter.connect(gain);
  sub.connect(subGain);
  subGain.connect(gain);
  gain.connect(mixer.bus('engine'));

  source.start();
  sub.start();

  // Not a number, so the first update always writes.
  let lastLevel: number | null = null;
  let lastHz: number | null = null;
  let lastWriteCount = 0;
  let totalWrites = 0;

  return {
    get lastWriteCount() {
      return lastWriteCount;
    },
    get totalWrites() {
      return totalWrites;
    },
    // source, filter, sub, subGain, gain.
    nodeCount: 5,

    update(params) {
      lastWriteCount = 0;
      const now = context.currentTime;

      /*
        The air fade is folded into the level here rather than given its own
        node. One multiply against one gain is cheaper than a second gain stage,
        and — more to the point — it keeps "how loud is the engine" a single
        number that a test can read, instead of a product of two nodes nobody
        can see at once.
      */
      const level = params.engine * params.engineAir;
      if (level !== lastLevel) {
        lastLevel = level;
        gain.gain.setTargetAtTime(level, now, SMOOTH_SECONDS);
        lastWriteCount += 1;
      }

      if (params.engineHz !== lastHz) {
        lastHz = params.engineHz;
        filter.frequency.setTargetAtTime(params.engineHz, now, SMOOTH_SECONDS);
        lastWriteCount += 1;
      }

      totalWrites += lastWriteCount;
    },

    stop() {
      source.stop();
      sub.stop();
    },
  };
}
