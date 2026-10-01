/**
 * The layout question every surface asks: is this a phone in portrait?
 *
 * Layout follows width and orientation; density follows the pointer
 * (docs/design/design-system.md §6), which the kit's primitives decide for
 * themselves. One query, owned here, so no surface invents its own breakpoint.
 */
import { useSyncExternalStore } from 'react';

/** Portrait and narrow: the primary strip above one sheet, controls behind tabs. */
export const PHONE_PORTRAIT = '(max-width: 37.5rem) and (orientation: portrait)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_PORTRAIT)
    : null;
}

function subscribe(onChange: () => void): () => void {
  const q = query();
  q?.addEventListener('change', onChange);
  return () => q?.removeEventListener('change', onChange);
}

export function usePhoneLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  );
}
