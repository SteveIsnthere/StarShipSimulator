/**
 * The audio engine: unlock, mute, and the one place that owns the context.
 *
 * THE AUTOPLAY PROBLEM, and why the answer here is not a workaround. Browsers
 * refuse audio before a user gesture, and this simulator opens with the intro
 * demo — an auto-landing that plays before the player has touched anything. So
 * the intro is SILENT until the first interaction, and SOUND-PLAN § 3.4 argues
 * that is correct rather than a compromise: sound arriving as you take control
 * is a better moment than sound that fights the autoplay policy and loses.
 *
 * MUTING SUSPENDS THE CONTEXT rather than zeroing a gain. A muted simulator
 * should do no audio work at all, not quiet audio work — which matters most on
 * the device where someone is most likely to mute it.
 *
 * LAZY. Nothing here is constructed until `unlock()` is called, so the audio
 * layer cannot appear in the first-load critical path even by accident. The
 * budget gate asserts first-load JS is unchanged by this milestone.
 */
import { createMixer, createNoiseBuffer, type AudioGraphContext, type Mixer } from './graph';

/** What a browser hands us. Narrowed so tests can stand in for it. */
export interface AudioHost {
  /** Construct the context. Called at most once, on the first gesture. */
  create(): AudioGraphContext & {
    readonly state: string;
    resume(): Promise<void>;
    suspend(): Promise<void>;
    close(): Promise<void>;
  };
}

export type HostContext = ReturnType<AudioHost['create']>;

export interface AudioEngine {
  /**
   * Start, or resume. Safe to call on every gesture — the browser requires a
   * gesture and does not mind being told twice.
   */
  unlock(): Promise<void>;
  /** Suspend or resume, and remember the choice. */
  setMuted(muted: boolean): Promise<void>;
  readonly muted: boolean;
  /** 'idle' before the first gesture, then the context's own state. */
  readonly state: string;
  /** Null until unlocked. */
  readonly mixer: Mixer | null;
  /** The shared looping noise buffer, built once with the graph. */
  readonly noise: AudioBuffer | null;
  destroy(): Promise<void>;
}

export const MUTE_KEY = 'starship:muted';

/**
 * Read the remembered choice, tolerating a browser that refuses storage.
 *
 * The same guarded read M6.4 uses for cinematic mode, and for the same reason:
 * a browser with site data blocked THROWS on access rather than returning null,
 * and a simulator that will not start because it could not remember a
 * preference would be a poor trade.
 */
export function readMuted(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    const store = storage ?? localStorage;
    return store.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const store = storage ?? localStorage;
    store.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Nothing to do and nothing worth saying: the toggle still works for this
    // session, it just will not be remembered.
  }
}

export interface AudioEngineOptions {
  host: AudioHost;
  /** Injected so the guarded read can be tested against a storage that throws. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  /** Start muted. Defaults to whatever was remembered. */
  muted?: boolean;
}

export function createAudioEngine(options: AudioEngineOptions): AudioEngine {
  const { host, storage } = options;

  let context: HostContext | null = null;
  let mixer: Mixer | null = null;
  let noise: AudioBuffer | null = null;
  let muted = options.muted ?? readMuted(storage);

  return {
    get muted() {
      return muted;
    },
    get state() {
      return context ? context.state : 'idle';
    },
    get mixer() {
      return mixer;
    },
    get noise() {
      return noise;
    },

    async unlock() {
      // Muted means muted: a gesture must not start audio someone switched off.
      if (muted) return;
      if (!context) {
        context = host.create();
        mixer = createMixer(context);
        noise = createNoiseBuffer(context);
      }
      if (context.state !== 'running') await context.resume();
    },

    async setMuted(next) {
      muted = next;
      writeMuted(next, storage);
      if (!context) return;
      if (next) await context.suspend();
      else await context.resume();
    },

    async destroy() {
      if (!context) return;
      await context.close();
      context = null;
      mixer = null;
      noise = null;
    },
  };
}
