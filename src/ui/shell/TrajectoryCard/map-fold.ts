/**
 * Whether the trajectory card is open: remembered per device, and folded by
 * default wherever the screen has no sky to spare.
 * Storage access goes through `$app/preferences`, which guards it.
 */
import { MAP_KEY, readItem, writeItem } from '$app/preferences';
import { layoutMode } from '../layout';

/** Folded on a phone in either orientation, open everywhere else. */
export function startsFolded(): boolean {
  return layoutMode() !== 'wide';
}

/** The remembered fold, or the layout's default when nothing is remembered (or storage is blocked). */
export function readMapOpen(): boolean {
  const stored = readItem(MAP_KEY);
  return stored === null ? !startsFolded() : stored === '1';
}

export function writeMapOpen(open: boolean): void {
  writeItem(MAP_KEY, open ? '1' : '0');
}
