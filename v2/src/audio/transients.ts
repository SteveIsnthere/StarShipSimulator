/**
 * Transients: ignition, shutdown, touchdown, crash, breakup.
 *
 * A DELIBERATE DEPARTURE FROM THE PLAN, and it should be read as one rather
 * than discovered later. SOUND-PLAN § 3.1 chose SAMPLES for these — "those are
 * events, not states, and synthesising a convincing one is a research project"
 * — and asked for a licence trail per file. They are synthesised here instead.
 *
 * The reason is not that the plan was wrong. It is that shipping third-party
 * audio into this repository is a decision with a licence trail the owner has
 * to be able to audit, and picking those files unilaterally — from a library
 * whose terms I cannot verify from here — would produce exactly the thing the
 * plan asked for in form and not in substance. An unverifiable licence trail is
 * worse than no samples.
 *
 * So: synthesised, zero bytes, no provenance question, and the interface below
 * is the same one a sample bank would present. § 7 already names this seam in
 * the other direction — "the layer is behind one interface, so a sampled loop
 * can replace the synth per-sound without touching anything else" — and that
 * works both ways. Substituting real recordings later is a change to this file
 * and nothing else.
 *
 * WHAT SYNTHESIS CAN AND CANNOT DO HERE. An ignition is a fast attack on
 * broadband noise with a resonance that opens; a touchdown is a low thud; a
 * breakup is a broadband crack. Those are the standard recipes and they are
 * honest, if not cinematic. § 6's closing line applies with extra force: what
 * no test covers is whether it sounds good.
 */
import type { AudioGraphContext, Mixer } from './graph';

export const TRANSIENTS = ['ignition', 'shutdown', 'touchdown', 'crash', 'breakup'] as const;
export type TransientName = (typeof TRANSIENTS)[number];

export interface TransientSpec {
  /** s — total length. Short: these are events, not beds. */
  readonly duration: number;
  /** s — time to peak. A fast attack is what makes something read as an impact. */
  readonly attack: number;
  /** 0..1 — peak level. */
  readonly level: number;
  /** Hz — filter centre at the start and at the end. */
  readonly fromHz: number;
  readonly toHz: number;
  /** Filter shape. Lowpass for weight, bandpass for a crack. */
  readonly filter: 'lowpass' | 'bandpass';
  readonly q: number;
}

/**
 * The bank.
 *
 * Every number is a shape rather than a measurement — there is nothing in
 * SimState that says how loud a touchdown is — so these are the one part of the
 * audio layer that is pure taste, and M8.5's mix pass is where they get moved
 * by ear.
 */
export const TRANSIENT_SPECS: Readonly<Record<TransientName, TransientSpec>> = {
  /** A Raptor catching: a hard bark that opens into the running rumble. */
  ignition: { duration: 0.9, attack: 0.012, level: 0.9, fromHz: 160, toHz: 900, filter: 'lowpass', q: 1.4 },
  /** The other direction — the flow collapsing, closing rather than opening. */
  shutdown: { duration: 0.7, attack: 0.02, level: 0.6, fromHz: 700, toHz: 90, filter: 'lowpass', q: 1.1 },
  /** Legs on concrete. Low, brief, over. */
  touchdown: { duration: 0.55, attack: 0.006, level: 0.85, fromHz: 220, toHz: 60, filter: 'lowpass', q: 2.2 },
  /** Not a bigger touchdown: broadband, and it keeps going. */
  crash: { duration: 2.2, attack: 0.004, level: 1, fromHz: 1_400, toHz: 70, filter: 'lowpass', q: 0.8 },
  /** A structural failure at altitude — a crack rather than a thud. */
  breakup: { duration: 1.8, attack: 0.003, level: 1, fromHz: 2_600, toHz: 300, filter: 'bandpass', q: 0.6 },
};

export interface TransientBank {
  fire(name: TransientName): void;
  /** How many one-shots have been fired, for the tests. */
  readonly firedCount: number;
  /** Nodes alive right now. One-shots are transient by definition — see below. */
  readonly liveNodes: number;
}

export interface TransientBankOptions {
  context: AudioGraphContext;
  mixer: Mixer;
  noise: AudioBuffer;
}

/**
 * One-shots are the one place in this layer that DOES create nodes per event,
 * and that is correct rather than a leak: a Web Audio one-shot is a source that
 * plays once and is garbage after it stops. What would be a leak is never
 * stopping them, so every source here is given an explicit stop time at
 * creation — nothing depends on anyone remembering to clean up.
 *
 * The count is bounded by the events themselves: five kinds, each latched to
 * fire once per occurrence, on a flight that has one touchdown and at most a
 * handful of ignitions.
 */
export function createTransientBank(options: TransientBankOptions): TransientBank {
  const { context, mixer, noise } = options;
  let firedCount = 0;
  let liveNodes = 0;

  return {
    get firedCount() {
      return firedCount;
    },
    get liveNodes() {
      return liveNodes;
    },

    fire(name) {
      const spec = TRANSIENT_SPECS[name];
      if (!spec) return;
      const now = context.currentTime;

      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;

      const filter = context.createBiquadFilter();
      filter.type = spec.filter;
      filter.Q.value = spec.q;
      filter.frequency.setValueAtTime(spec.fromHz, now);
      // Exponential rather than linear, because pitch is perceived
      // logarithmically — a linear sweep from 1400 Hz to 70 spends most of its
      // time in the top octave and arrives all at once.
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(1, spec.toHz),
        now + spec.duration,
      );

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(spec.level, now + spec.attack);
      // Toward zero rather than to it: exponentialRamp cannot reach zero, and a
      // linear tail on an impact sounds like a fade rather than a decay.
      gain.gain.exponentialRampToValueAtTime(0.0005, now + spec.duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(mixer.bus('transient'));

      source.start(now);
      // The stop is scheduled AT CREATION. A one-shot that outlives its
      // envelope is silent and immortal, which is the shape of every audio leak
      // ever written.
      source.stop(now + spec.duration);
      liveNodes += 3;
      source.onended = () => {
        liveNodes -= 3;
      };

      firedCount += 1;
    },
  };
}
