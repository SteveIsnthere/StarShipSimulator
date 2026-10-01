/**
 * Whether the trajectory card is open: remembered per device, and folded by
 * default wherever the screen has no sky to spare.
 *
 * Every storage access is guarded: a browser with site data blocked throws on
 * access rather than returning null, and the map must not stop the simulator
 * starting because it could not remember a fold.
 */
import { MAP_KEY } from '$app/preferences';
import { layoutMode } from '../layout';

/** Folded on a phone in either orientation, open everywhere else. */
export function startsFolded(): boolean {
  return layoutMode() !== 'wide';
}

/** The remembered fold, or the layout's default when nothing is remembered. */
export function readMapOpen(): boolean {
  try {
    const stored = localStorage.getItem(MAP_KEY);
    if (stored !== null) return stored === '1';
  } catch {
    // Storage blocked: the layout default, and the toggle still works for this visit.
  }
  return !startsFolded();
}

export function writeMapOpen(open: boolean): void {
  try {
    localStorage.setItem(MAP_KEY, open ? '1' : '0');
  } catch {
    // See readMapOpen.
  }
}
