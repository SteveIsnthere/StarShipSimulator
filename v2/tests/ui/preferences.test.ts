/**
 * M12.5: the remembered preferences, as a list rather than as five habits.
 *
 * The interesting claim is not that `removeItem` works. It is that the list is
 * COMPLETE — that a preference cannot be added to the application without
 * appearing here — because the failure mode of an incomplete list is a
 * "Restore Defaults" button that restores most of them, which is worse than
 * one that restores none.
 *
 * So the test greps the source. That is unusual and it is deliberate: the thing
 * under test is a relationship between two files, and no amount of exercising
 * `clearPreferences` can see a key that was never handed to it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_KEY,
  CINEMATIC_KEY,
  clearPreferences,
  HINT_KEY,
  MAP_KEY,
  NON_PREFERENCE_KEYS,
  PREFERENCE_KEYS,
} from '$ui/preferences';
import { MUTE_KEY, VOLUME_KEY } from '$audio/engine';

const SRC = join(import.meta.dirname, '../../src');

/** Every file under `src/`, so a new module cannot hide a new key. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|svelte)$/.test(entry.name) ? [path] : [];
  });
}

describe('the preference list', () => {
  it('names all six, from the modules that own them', () => {
    /*
      Six since M12.6 added the first-flight hint — and the grep below is what
      said so. The hint's key was written in `preferences.ts` and used in
      `App.svelte`, both correct, and this suite still went red until it was
      added to `PREFERENCE_KEYS`, which is the entire point of the arrangement:
      Restore Defaults would otherwise have quietly stopped restoring the hint.
    */
    expect([...PREFERENCE_KEYS].sort()).toEqual(
      [MUTE_KEY, VOLUME_KEY, CINEMATIC_KEY, CAMERA_KEY, MAP_KEY, HINT_KEY].sort(),
    );
  });

  it('and every `starship:` key in the source is one of them', () => {
    /*
      THE ASSERTION THAT ACTUALLY GUARDS THE BUTTON. Every stored key in this
      application is written as a `starship:`-prefixed literal exactly once, at
      its declaration; find them all and the list must account for every one.
      A sixth preference declared anywhere under `src/` fails here, at the
      moment it is written, rather than at the moment a player presses Restore
      Defaults and half of it works.

      The prefix is a NAMESPACE, though, not a promise about storage, so a
      `starship:` string that is not a preference — the reset event's own name
      is the first — is accounted for separately. Without that escape hatch the
      obvious fix for this test would be to add a non-preference to
      `PREFERENCE_KEYS` and let Restore Defaults delete something it does not
      own.
    */
    const found = new Set<string>();
    for (const file of sources(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(/['"`](starship:[a-zA-Z0-9:_-]+)['"`]/g)) {
        found.add(match[1]!);
      }
    }
    expect(found.size, 'no stored keys found — has the prefix changed?').toBeGreaterThan(0);
    expect([...found].sort()).toEqual([...PREFERENCE_KEYS, ...NON_PREFERENCE_KEYS].sort());
  });

  it('and the two lists never overlap', () => {
    // A key in both would be cleared AND excused, which is not a state either
    // list is meant to describe.
    for (const key of NON_PREFERENCE_KEYS) expect(PREFERENCE_KEYS).not.toContain(key);
  });

  it('clears every key it names', () => {
    const map = new Map(PREFERENCE_KEYS.map((key) => [key, 'something']));
    clearPreferences({ removeItem: (k) => void map.delete(k) });
    expect([...map.keys()]).toEqual([]);
  });

  it('and leaves keys it does not own alone', () => {
    // `storage.clear()` would have been one line. This origin is not guaranteed
    // to be this application's alone, and the button does not say "forget
    // everything".
    const map = new Map<string, string>([[MAP_KEY, '1'], ['someone-elses', 'keep me']]);
    clearPreferences({ removeItem: (k) => void map.delete(k) });
    expect([...map.keys()]).toEqual(['someone-elses']);
  });

  it('and survives a browser that refuses site data', () => {
    expect(() =>
      clearPreferences({
        removeItem: () => {
          throw new Error('site data blocked');
        },
      }),
    ).not.toThrow();
  });
});
