/**
 * The marks a page carries to take part in the page transition (FB-144). They live
 * in the light `@ui/motion` entry so a page can mark itself without loading GSAP.
 *
 * - `root`: the page's outermost element (its `main`). Required on both pages.
 * - `outline`: on the exit page, a bordered region whose border undraws.
 * - `panel`: on the destination, where the pressed tile's outline lands. Its
 *   content arrives inside the outline as it lands.
 * - `fill`: on the destination, a region whose border draws on while it fills
 *   in as a hard-edged brick wave.
 * - `arrive`: on the destination, content that rises in (a header).
 *
 * Anything unmarked on the destination stays hidden until the hand-off.
 */
export const PAGE_TRANSITION_ATTR = 'data-page-transition';

export type PageTransitionPart = 'root' | 'outline' | 'panel' | 'fill' | 'arrive';

/** Spread onto an element: `<main {...pageTransitionPart('root')}>`. */
export function pageTransitionPart(part: PageTransitionPart): { [PAGE_TRANSITION_ATTR]: PageTransitionPart } {
	return { [PAGE_TRANSITION_ATTR]: part };
}

export function pageTransitionSelector(part: PageTransitionPart): string {
	return `[${PAGE_TRANSITION_ATTR}="${part}"]`;
}
