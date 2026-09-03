/**
 * Everything this simulator remembers about you, in one list (M12.5).
 *
 * There are five settings that survive a reload and, until this file, they were
 * declared in four different modules: mute and the level in `audio/engine.ts`,
 * cinematic mode and the camera in `App.svelte`, the trajectory map's fold in
 * `TrajectoryMap.svelte`. Each read was independently correct and each one was
 * guarded against a browser that refuses site data, which is the interesting
 * part — the pattern was already agreed, it just had no name.
 *
 * It needed one the moment "Restore Defaults" existed. A button that put back
 * only the preferences declared on the same screen as itself would be worse
 * than no button: the ones it missed would look like bugs. So the list is here,
 * the components import their own key from it, and adding a sixth preference
 * without adding it to `PREFERENCE_KEYS` is visible in a test rather than at
 * the moment a player presses the button and half of it works.
 */
import { MUTE_KEY, VOLUME_KEY } from '$audio/engine';

/** Hide the flight-controls layer, leaving the broadcast. M6.4. */
export const CINEMATIC_KEY = 'starship:cinematic';
/** The director's lens, in cinematic mode. M11.6. */
export const CAMERA_KEY = 'starship:camera';
/** Whether the trajectory map is folded away. M7.1. */
export const MAP_KEY = 'starship:map';

/**
 * Broadcast, sent once a reset has cleared the keys.
 *
 * A WINDOW EVENT, which wants justifying because nothing else in this
 * application uses one. The five preferences are read by four components that
 * have no relationship to each other — the menu that owns the button cannot
 * reach the trajectory map's fold, and threading a counter down through
 * `Broadcast` so it could would put a prop about settings into a component
 * about layout. Each holder listens for this and re-reads its own default,
 * which is the same thing it does on load.
 */
export const PREFERENCES_RESET_EVENT = 'starship:preferences-reset';

/**
 * Every key, including the two the audio engine owns.
 *
 * Imported rather than repeated: a copy here would be a second source of truth
 * for a string that has to match exactly, and the failure mode of getting it
 * wrong is a preference that quietly refuses to clear.
 */
export const PREFERENCE_KEYS: readonly string[] = [
  MUTE_KEY,
  VOLUME_KEY,
  CINEMATIC_KEY,
  CAMERA_KEY,
  MAP_KEY,
];

/**
 * `starship:` strings that are NOT preferences and must not be cleared.
 *
 * Empty today, and it exists so that it stays possible for it not to be. The
 * completeness test greps the source for the prefix, which is the only way to
 * catch a preference someone forgot to list — but the prefix is a namespace,
 * not a promise about storage, and the first channel name or cache key to use
 * it would fail that test with an obvious wrong fix available: add it to
 * `PREFERENCE_KEYS` and let Restore Defaults delete something it should not.
 * This is where it goes instead.
 */
export const NON_PREFERENCE_KEYS: readonly string[] = [PREFERENCES_RESET_EVENT];

/**
 * Forget every remembered preference.
 *
 * Guarded the same way every read is: a browser with site data blocked THROWS
 * on access rather than returning null, and there is nothing stored to clear
 * there anyway. Clearing keys one at a time rather than `storage.clear()`,
 * because this application is not guaranteed to be the only thing on its
 * origin and wiping a namespace it does not own is not what the button says.
 */
export function clearPreferences(storage?: Pick<Storage, 'removeItem'>): void {
  for (const key of PREFERENCE_KEYS) {
    try {
      const store = storage ?? localStorage;
      store.removeItem(key);
    } catch {
      // Nothing stored, nothing to clear.
    }
  }
  // Guarded because this module is exercised from Node, where there is no
  // window and nothing listening.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREFERENCES_RESET_EVENT));
}
