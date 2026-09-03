/**
 * M12.4 — the phone's other output, and every rule it is under.
 *
 * The whole module is a set of refusals, so most of these tests are about when
 * it stays quiet. That is the right shape: a thing that buzzes a stranger's
 * phone should be easier to prove silent than to prove loud.
 */
import { describe, expect, it, vi } from 'vitest';
import { createHaptics, durationFor, END_MS, EVENT_MS, type HapticHost } from '$hud/haptics';
import { EVENT_IDS } from '$hud/timeline';

function host(overrides: Partial<HapticHost> = {}) {
  const calls: (number | number[])[] = [];
  const base: HapticHost = {
    vibrate: (pattern) => {
      calls.push(pattern);
      return true;
    },
    reducedMotion: () => false,
  };
  return { calls, host: { ...base, ...overrides } as HapticHost };
}

describe('when it buzzes', () => {
  it('once per event, after a gesture', () => {
    const { calls, host: h } = host();
    const haptics = createHaptics(h);

    haptics.event('LIFTOFF');
    expect(calls, 'nothing before a gesture').toEqual([]);

    haptics.unlock();
    haptics.event('LIFTOFF');
    haptics.event('MAX-Q');
    expect(calls).toEqual([EVENT_MS, EVENT_MS]);
  });

  it('and longer at the end of the flight than during it', () => {
    // Two lengths, not a pattern language: a vocabulary of buzzes is a thing
    // to learn and nobody is going to learn one for a landing.
    expect(durationFor('TOUCHDOWN')).toBe(END_MS);
    expect(durationFor('LOSS')).toBe(END_MS);
    expect(END_MS).toBeGreaterThan(EVENT_MS);
    for (const id of EVENT_IDS) {
      if (id === 'TOUCHDOWN' || id === 'LOSS') continue;
      expect(durationFor(id), id).toBe(EVENT_MS);
    }
  });

  it('and every event id has a duration, so a new one cannot arrive silent', () => {
    for (const id of EVENT_IDS) expect(durationFor(id), id).toBeGreaterThan(0);
  });
});

describe('when it does not', () => {
  it('under prefers-reduced-motion, which is a request not to be moved', () => {
    const { calls, host: h } = host({ reducedMotion: () => true });
    const haptics = createHaptics(h);
    haptics.unlock();
    haptics.event('TOUCHDOWN');
    expect(calls).toEqual([]);
    expect(haptics.available).toBe(false);
  });

  it('on a platform with no vibration at all', () => {
    const haptics = createHaptics({ reducedMotion: () => false });
    haptics.unlock();
    // The assertion is that this does not throw and reports itself honestly.
    expect(() => haptics.event('LIFTOFF')).not.toThrow();
    expect(haptics.available).toBe(false);
  });

  it('and never before a gesture, whatever else is true', () => {
    const { calls, host: h } = host();
    const haptics = createHaptics(h);
    for (const id of EVENT_IDS) haptics.event(id);
    expect(calls).toEqual([]);
    expect(haptics.available).toBe(false);
  });
});

describe('and a refusal from the browser is not a crash', () => {
  it('a throwing vibrate is swallowed', () => {
    // Engines disagree about what counts as user activation, and a rocket must
    // not stop flying because a phone declined to buzz.
    const thrown = vi.fn(() => {
      throw new Error('not allowed');
    });
    const haptics = createHaptics({ vibrate: thrown, reducedMotion: () => false });
    haptics.unlock();
    expect(() => haptics.event('TOUCHDOWN')).not.toThrow();
    expect(thrown).toHaveBeenCalledTimes(1);
  });
});

describe('and the setting is read live, not remembered', () => {
  it('turning reduced motion on mid-session stops the buzzing', () => {
    // Which is exactly when someone turns it on: they have just been buzzed.
    let reduced = false;
    const calls: number[] = [];
    const haptics = createHaptics({
      vibrate: (pattern) => {
        calls.push(pattern as number);
        return true;
      },
      reducedMotion: () => reduced,
    });
    haptics.unlock();

    haptics.event('LIFTOFF');
    expect(calls.length).toBe(1);
    expect(haptics.available).toBe(true);

    reduced = true;
    haptics.event('MAX-Q');
    expect(calls.length, 'nothing more after the setting changed').toBe(1);
    expect(haptics.available).toBe(false);

    reduced = false;
    haptics.event('MECO');
    expect(calls.length, 'and it comes back when it is turned off').toBe(2);
  });
});
