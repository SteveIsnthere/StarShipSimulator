/**
 * M12.4 — the phone's other output.
 *
 * A mission event lights a dot in a strip the player may not be looking at:
 * they are watching a rocket, and on a phone the rocket is most of the screen.
 * `navigator.vibrate` costs nothing, ships nothing, and is the one channel that
 * reaches someone whose eyes are elsewhere.
 *
 * THREE RULES, and each is a decision rather than a default.
 *
 * 1. BEHIND `prefers-reduced-motion`. The setting is a request not to be moved,
 *    and a phone buzzing in someone's hand is motion in the most literal sense
 *    available to a web page. The same media query that stills the camera
 *    stills this.
 * 2. AFTER A GESTURE, like the audio. Browsers gate vibration on user
 *    activation, and a call before one is a console warning per event on some
 *    engines and silence on the rest.
 * 3. NOT A PATTERN LANGUAGE. Two lengths: a tick for an event, and a longer one
 *    for the end of the flight. A vocabulary of buzzes is a thing to learn, and
 *    nobody is going to learn it for a landing.
 */
import type { EventId } from './timeline';

/** ms — a mission event. Short enough to read as punctuation. */
export const EVENT_MS = 18;
/** ms — the flight is over, one way or the other. */
export const END_MS = 90;

/** How long an event should buzz for, or 0 for not at all. */
export function durationFor(id: EventId): number {
  return id === 'TOUCHDOWN' || id === 'LOSS' ? END_MS : EVENT_MS;
}

/** What this module needs from the platform, so a test can be the platform. */
export interface HapticHost {
  /** `navigator.vibrate`, or absent — most desktops have none. */
  readonly vibrate?: (pattern: number | number[]) => boolean;
  /**
   * True when the player has asked not to be moved.
   *
   * A FUNCTION, not a boolean, and review is why. Sampled once at startup it
   * could never notice the setting being turned on mid-session — which is
   * exactly when someone turns it on, because they have just been buzzed.
   */
  reducedMotion(): boolean;
}

export interface Haptics {
  /** A gesture has happened; vibration is allowed from here. */
  unlock(): void;
  /** Buzz for one mission event. Silent before a gesture, or under reduced motion. */
  event(id: EventId): void;
  /** True when a buzz would actually reach the player right now. */
  readonly available: boolean;
}

export function createHaptics(host: HapticHost): Haptics {
  const vibrate = host.vibrate;
  let unlocked = false;

  return {
    get available() {
      return vibrate !== undefined && !host.reducedMotion() && unlocked;
    },

    unlock(): void {
      unlocked = true;
    },

    event(id: EventId): void {
      if (vibrate === undefined || host.reducedMotion() || !unlocked) return;
      /*
        Swallow the throw. `vibrate` rejects a call from a page that has not
        been interacted with in a way THIS browser counts, and different engines
        count differently; a rocket must not stop flying because a phone
        declined to buzz.
      */
      try {
        vibrate(durationFor(id));
      } catch {
        // Deliberately empty: see above.
      }
    },
  };
}

/** Read the platform, in the one place that touches `navigator` and `matchMedia`. */
export function browserHost(): HapticHost {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const vibrate = nav && typeof nav.vibrate === 'function' ? nav.vibrate.bind(nav) : undefined;
  /*
    The query object once, its `matches` on every call. Constructing a
    MediaQueryList per event would be work on the flight's path for a value
    that changes about once a year; reading `matches` is a property access.
  */
  const query =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  return {
    ...(vibrate ? { vibrate } : {}),
    reducedMotion: () => query?.matches === true,
  };
}
