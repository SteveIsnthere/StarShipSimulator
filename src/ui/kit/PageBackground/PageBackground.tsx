/**
 * PageBackground — shared flat black backdrop for preflight pages.
 *
 * Portable pages use one non-interactive opaque black field.
 */
export interface PageBackgroundProps {
	/** @deprecated Compatibility only. The monochrome background ignores hue. */
	hue?: 'teal';
}

export function PageBackground(_props: PageBackgroundProps = {}) {
	return (
		<div className="pointer-events-none absolute inset-0 bg-ui-bg" aria-hidden="true" />
	);
}
