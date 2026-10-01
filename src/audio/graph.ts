/**
 * The Web Audio graph, and the rules it lives under.
 *
 * WHY THIS EXISTS. The simulator has been silent for its entire life, 2021 and
 * v2 alike. SOUND-PLAN § 1 makes the case: sound is not decoration in a vehicle
 * simulator, it is an instrument — three Raptors at 40% and two at 100% produce
 * nearly the same thrust number and sound nothing alike. The payoff of the
 * whole milestone is not the noise but the CONTRAST, the fade to near-silence
 * as the air runs out, and you cannot convey that to someone who has had
 * silence the whole time.
 *
 * WHAT THIS FILE IS. The plumbing only: the context, the mixer, the unlock, the
 * mute. It builds the graph ONCE and never rebuilds it — SOUND-PLAN § 6 makes
 * "node count is constant over a long flight" a test, because that is the audio
 * version of the M3.7 leak test that would have caught the 2021 particle leak.
 *
 * THE SEVENTH WALL. `core/` may not import from here, lint-enforced in
 * eslint.config.js. Sound is an OUTPUT of the simulation. If the audio layer
 * needs a physical value that is not in SimState, the answer is to derive it in
 * `audio/`, not to add it to core and move the goldens.
 *
 * INJECTED, NOT ASSUMED. Every function here takes its `AudioContext` (or a
 * minimal shape of one) rather than reaching for a global. That is what lets
 * the mixer be tested in Node against `OfflineAudioContext` — and it is the
 * same reasoning that made the HUD binders testable: a layer that reaches for
 * its environment can only be checked by running the environment.
 */

/**
 * The part of an AudioContext this layer uses.
 *
 * Narrow on purpose. `OfflineAudioContext` satisfies it, which is what makes
 * "the engine is louder at 100% than at 40%" an assertion about a rendered
 * buffer's RMS rather than an opinion.
 */
export interface AudioGraphContext {
  readonly sampleRate: number;
  readonly currentTime: number;
  readonly destination: AudioNode;
  createGain(): GainNode;
  createBiquadFilter(): BiquadFilterNode;
  createBufferSource(): AudioBufferSourceNode;
  createOscillator(): OscillatorNode;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
}

/** Named mixer buses. One per source family, so a mix pass has something to grab. */
export const BUSES = ['engine', 'aero', 'transient', 'warning'] as const;
export type BusName = (typeof BUSES)[number];

/**
 * Where each bus sits relative to the master, before any per-frame modulation.
 *
 * A first pass rather than a finished mix — SOUND-PLAN § 6 is blunt that no
 * test covers whether it sounds good, and M8.5 is where these get moved by ear.
 * What they are here is a sane starting point that keeps the warning tone
 * audible over a full-throttle ascent, which is the one mix decision that is a
 * safety property rather than a taste one.
 */
export const BUS_GAIN: Readonly<Record<BusName, number>> = {
  engine: 0.55,
  aero: 0.45,
  transient: 0.8,
  warning: 0.5,
};

export interface Mixer {
  readonly context: AudioGraphContext;
  /** The bus a source should connect to. */
  bus(name: BusName): GainNode;
  /** The master gain, between the buses and the destination. */
  readonly master: GainNode;
  /** Every node this mixer created, for the leak test. */
  readonly nodeCount: number;
}

/**
 * Build the mixer. Called once per context, never again.
 */
export function createMixer(context: AudioGraphContext): Mixer {
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);

  const buses = {} as Record<BusName, GainNode>;
  for (const name of BUSES) {
    const gain = context.createGain();
    gain.gain.value = BUS_GAIN[name];
    gain.connect(master);
    buses[name] = gain;
  }

  return {
    context,
    master,
    bus: (name) => buses[name],
    // The master plus one per bus. Fixed at construction: this number is what
    // the leak test asserts does not move over a long flight.
    nodeCount: BUSES.length + 1,
  };
}

/**
 * Seconds of noise held in one looping buffer.
 *
 * Two, because a shorter loop is audible as a loop and a longer one is memory
 * spent on something nobody can hear the difference in. Generated rather than
 * shipped: this is the whole reason § 3.1 chose synthesis — a rumble loop long
 * enough not to sound looped costs hundreds of kB, and this costs zero bytes on
 * the wire.
 */
export const NOISE_SECONDS = 2;

/**
 * White noise, generated from a fixed seed.
 *
 * Deterministic for the same reason M7.6's cloud deck is: not because the sim
 * needs it, but so an `OfflineAudioContext` render is reproducible and a test
 * comparing two renders is comparing the thing it means to compare.
 */
export function createNoiseBuffer(context: AudioGraphContext, seed = 0x9e3779b9): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * NOISE_SECONDS));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    // xorshift32, the same family core/rng.ts uses, kept local because `audio/`
    // reaching into core for decoration would blur a boundary worth keeping.
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    data[i] = (state / 4294967296) * 2 - 1;
  }
  return buffer;
}
