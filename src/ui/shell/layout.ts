/**
 * The layout question every surface asks: which of the three screens is this?
 *
 * - `phone`: portrait and narrow. The primary strip under the status bar,
 *   controls behind a tab bar, one sheet at a time.
 * - `short`: a phone held sideways. Desktop-like rails and a top-centre
 *   cluster, but no height to spend: the cluster is the compact one, the rails
 *   are narrower, start folded and open one at a time.
 * - `wide`: everything else.
 *
 * Layout follows width, height and orientation; density follows the pointer
 * (docs/design/design-system.md §6), which the kit's primitives decide for
 * themselves. The queries are owned here, so no surface invents a breakpoint.
 */
import { useSyncExternalStore } from 'react';

/** Portrait and narrow: the primary strip above one sheet, controls behind tabs. */
export const PHONE_PORTRAIT = '(max-width: 37.5rem) and (orientation: portrait)';

/** A phone held sideways: wide enough to look like a laptop, with no height to spend. */
export const SHORT_LANDSCAPE = '(height < 31.25rem) and (orientation: landscape)';

export type LayoutMode = 'phone' | 'short' | 'wide';

function matches(q: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
}

/** The current mode, outside React (the map's first fold reads it). */
export function layoutMode(): LayoutMode {
  if (matches(PHONE_PORTRAIT)) return 'phone';
  if (matches(SHORT_LANDSCAPE)) return 'short';
  return 'wide';
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const queries = [window.matchMedia(PHONE_PORTRAIT), window.matchMedia(SHORT_LANDSCAPE)];
  for (const q of queries) q.addEventListener('change', onChange);
  return () => {
    for (const q of queries) q.removeEventListener('change', onChange);
  };
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, layoutMode, () => 'wide');
}

/** Shorthand for the question most surfaces ask. */
export function usePhoneLayout(): boolean {
  return useLayoutMode() === 'phone';
}
