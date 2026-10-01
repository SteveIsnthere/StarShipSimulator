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
import { createAudioParams, readParams, type AudioParams } from './params';
import { createAeroVoice, createEngineVoice, createWarningVoice, type Voice } from './voices';
import { createEdgeDetector, type EdgeDetector } from './events';
import { createTransientBank, type TransientBank, type TransientName } from './transients';
import type { SimState } from '$core/state';

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
  /**
   * Set the master level, 0 to 1, and remember it (M12.5).
   *
   * DISTINCT FROM MUTE, and the difference is not cosmetic. Mute SUSPENDS the
   * context — a muted simulator does no audio work at all, which is
   * SOUND-PLAN 3.4's whole argument. A level is a gain on a running graph: the
   * work still happens, it is just quieter. So a level of zero is not mute, and
   * this deliberately does not turn into one; someone who wants silence for
   * free has the switch for it.
   *
   * `remember` defaults to true. A slider being DRAGGED passes false and calls
   * once more with true when it is let go: `localStorage.setItem` is
   * synchronous, an `oninput` fires on every pixel of travel, and a hundred
   * synchronous writes across one drag is a stutter on a phone. The gain still
   * moves on every one of them — the sound follows the finger; only the
   * remembering waits for the finger to stop.
   */
  setVolume(level: number, options?: { remember?: boolean }): void;
  /** 0 to 1. The remembered level, whether or not anything is built yet. */
  readonly volume: number;
  /** 'idle' before the first gesture, then the context's own state. */
  readonly state: string;
  /** Null until unlocked. */
  readonly mixer: Mixer | null;
  /** The shared looping noise buffer, built once with the graph. */
  readonly noise: AudioBuffer | null;
  /**
   * Push one frame of simulation state.
   *
   * Called from App.svelte's single rAF subscriber, like every binder in
   * `hud/`. Costs one property read while muted or before the first gesture,
   * and a handful of diffed comparisons after it.
   */
  update(state: SimState): void;
  /** AudioParam writes performed by the last update, for the diff tests. */
  readonly lastWriteCount: number;
  /**
   * Re-arm the transient latches.
   *
   * Called when a flight is configured or restarted: the same flight flown
   * again is a new flight, and its touchdown deserves to be heard again.
   */
  resetFlight(): void;
  /** One-shots fired since the last reset, for the tests. */
  readonly transientCount: number;
  /**
   * The tab went to the background, or came back (M8.5).
   *
   * A phone that navigates away, locks, or takes a call should not keep a
   * rocket running in someone's pocket — and a browser that suspends the
   * context itself leaves the engine believing it is running, so the two have
   * to be kept in step deliberately rather than hoped about.
   *
   * Distinct from mute: this does not touch the remembered preference, so a tab
   * that comes back comes back to whatever the player chose.
   */
  setBackgrounded(hidden: boolean): Promise<void>;
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

export const VOLUME_KEY = 'starship:volume';

/**
 * The level a fresh profile starts at. Also what the defaults action restores.
 *
 * ONE, and that is a decision rather than a placeholder. M8.5 tuned the four
 * bus gains against a master of 1.0; anything less here would ship a mix 20%
 * quieter than the one that was balanced, for no reason other than leaving the
 * new slider somewhere to travel upward. Adding a control is not the moment to
 * re-mix. `tests/audio/engine.test.ts` pins this value for exactly that reason.
 */
export const DEFAULT_VOLUME = 1;

/**
 * Clamp anything to a usable level.
 *
 * Storage is a string a person can edit and a slider is an input that can be
 * driven from a script, so neither is trusted: NaN, -3 and 40 all have to mean
 * something, and what they mean is "the nearest level that exists".
 */
export function clampVolume(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, level));
}

/** The remembered level, tolerating a browser that refuses storage. */
export function readVolume(storage?: Pick<Storage, 'getItem'>): number {
  try {
    const store = storage ?? localStorage;
    const stored = store.getItem(VOLUME_KEY);
    /*
      An EMPTY string is absent, not zero. `Number('')` is 0, which is a
      perfectly valid level, so a key written empty by anything — a storage
      quirk, a hand edit, a half-finished migration — would come back as a
      simulator that is silent while its Sound switch reports on. That is the
      worst failure this function has, because it looks like a broken build.
    */
    if (stored === null || stored.trim() === '') return DEFAULT_VOLUME;
    return clampVolume(Number(stored));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function writeVolume(level: number, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const store = storage ?? localStorage;
    store.setItem(VOLUME_KEY, String(clampVolume(level)));
  } catch {
    // As with mute: the level still works for this session, it just will not be
    // remembered.
  }
}

export interface AudioEngineOptions {
  host: AudioHost;
  /** Injected so the guarded read can be tested against a storage that throws. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  /** Start muted. Defaults to whatever was remembered. */
  muted?: boolean;
  /** Start at this level, 0 to 1. Defaults to whatever was remembered. */
  volume?: number;
}

export function createAudioEngine(options: AudioEngineOptions): AudioEngine {
  const { host, storage } = options;

  let context: HostContext | null = null;
  let mixer: Mixer | null = null;
  let noise: AudioBuffer | null = null;
  let muted = options.muted ?? readMuted(storage);
  let volume = clampVolume(options.volume ?? readVolume(storage));

  const voices: Voice[] = [];
  const params: AudioParams = createAudioParams();
  let lastWriteCount = 0;

  let backgrounded = false;

  const edges: EdgeDetector = createEdgeDetector();
  let transients: TransientBank | null = null;
  /** A stable closure, so passing it to `observe` costs no allocation. */
  const fire = (name: TransientName) => transients?.fire(name);

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
    get lastWriteCount() {
      return lastWriteCount;
    },
    get transientCount() {
      return transients?.firedCount ?? 0;
    },

    resetFlight() {
      edges.reset();
    },

    update(state) {
      lastWriteCount = 0;
      // Nothing built yet, or switched off: one comparison and out. The frame
      // path must not pay for a feature that is not running.
      if (!context || muted || backgrounded || voices.length === 0) return;
      readParams(state, params);
      for (const voice of voices) {
        voice.update(params);
        lastWriteCount += voice.lastWriteCount;
      }
      edges.observe(state, fire);
    },

    async unlock() {
      // Muted means muted: a gesture must not start audio someone switched off.
      if (muted || backgrounded) return;
      if (!context) {
        context = host.create();
        mixer = createMixer(context);
        // The remembered level reaches the graph the moment the graph exists.
        // Setting it before this point had nowhere to go, which is why the
        // level lives in a variable and the node is written from it rather than
        // the other way round.
        mixer.master.gain.value = volume;
        noise = createNoiseBuffer(context);
        // Built once, here, and never rebuilt — the claim the leak test makes.
        voices.push(createEngineVoice({ context, mixer, noise }));
        voices.push(createAeroVoice({ context, mixer, noise }));
        voices.push(createWarningVoice({ context, mixer, noise }));
        transients = createTransientBank({ context, mixer, noise });
      }
      if (context.state !== 'running') await context.resume();
    },

    async setBackgrounded(hidden) {
      backgrounded = hidden;
      if (!context) return;
      // Suspend either way; only come back if the player still wants sound.
      if (hidden) await context.suspend();
      else if (!muted) await context.resume();
    },

    get volume() {
      return volume;
    },

    setVolume(level, options) {
      volume = clampVolume(level);
      if (options?.remember !== false) writeVolume(volume, storage);
      // Assigned, not ramped. This is a settings control, not a mix automation:
      // it moves when a person drags it, at which point the value they let go
      // on is the value they meant.
      if (mixer) mixer.master.gain.value = volume;
    },

    async setMuted(next) {
      muted = next;
      writeMuted(next, storage);
      if (!context) return;
      if (next) await context.suspend();
      // Unmuting into a backgrounded tab would start audio nobody is looking
      // at — the two switches are independent and both have to agree.
      else if (!backgrounded) await context.resume();
    },

    async destroy() {
      if (!context) return;
      for (const voice of voices) voice.stop();
      voices.length = 0;
      await context.close();
      context = null;
      mixer = null;
      noise = null;
    },
  };
}
