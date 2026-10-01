/**
 * Motion tokens — single source of truth for Flying Bricks animation timing and easing.
 * Derived from FB-141 / design-system §7. No literal durations outside this module.
 */

export const MOTION_DURATIONS = {
	/** First page load (logo only) */
	firstPageLoad: 0.28,
	/** Page transition */
	pageTransition: 0.6,
	/** First spawn instrument power-up */
	firstSpawn: 0.8,
	/** In-flight respawn / quick restart */
	respawn: 0.12,
	/** Chip to panel expansion */
	chipOpen: 0.22,
	/** Panel to chip collapse */
	chipClose: 0.14,
	/** Panel content fading in over the last stretch of the chip expansion */
	chipContentIn: 0.06,
	/** Panel content fading out at the start of the collapse */
	chipContentOut: 0.05,
	/** General modal / overlay entrance */
	overlayEnter: 0.18,
	/** General modal / overlay exit */
	overlayExit: 0.14,
	/** Value/label arrival delay offset */
	readingArrival: 0.35,
	/** Standard fade duration */
	fade: 0.4,
	/** Standard element move */
	move: 0.9,
	/** Camera flight transition */
	camera: 1.0,
} as const;

export const MOTION_EASES = {
	/** Standard entrance deceleration */
	out: 'power3.out',
	/** Snappy label/text arrival */
	label: 'power4.out',
	/** Smooth bi-directional motion */
	inOut: 'power3.inOut',
	/** Direct departure acceleration */
	in: 'power3.in',
	/** Camera and large scene moves */
	camera: 'expo.inOut',
	/** First-spawn power-up draw-ons (design-system §7.2) */
	firstSpawn: 'power1.out',
	/** Chip to panel expansion (design-system §7.2) */
	chipOpen: 'power2.out',
	/** Panel to chip collapse (design-system §7.2) */
	chipClose: 'power2.in',
	/** Linear / frame-exact progress */
	linear: 'none',
} as const;

/**
 * The landing → destination page transition (FB-144), as approved in the motion reference
 * (`docs/design/motion/reference/scene-transition.js`). Seconds. Exit times run from the press;
 * enter times run from the start of the carry, once the destination has been laid out.
 */
export const PAGE_TRANSITION = {
	/** The pressed tile flashes white… */
	flashOn: 0.06,
	/** …and the flash fades off. */
	flashOff: 0.18,
	/** The landing content fades out; the route changes when it is gone. */
	contentOut: 0.12,
	/** The exit outlines undraw, starting just after the press. */
	outlinesOutAt: 0.02,
	outlinesOut: 0.15,
	/** The pressed tile's outline travels onto the destination panel. */
	carry: 0.38,
	carryEase: 'power2.inOut',
	// The reference starts the carry 0.06 s into the exit; here the destination panel only exists
	// once the route has changed, so the carry starts after the exit. The offsets below are the
	// reference's times from the press, less the exit, so each part still lands when it did there.
	/** The destination header rises in. */
	arriveAt: 0.04,
	arriveRise: 4,
	arriveStagger: 0.04,
	/** The fill region's border draws on. */
	fillOutlineAt: 0.02,
	fillOutline: 0.32,
	/** The fill region's brick wave: start, diagonal sweep and brick size (px). */
	bricksAt: 0.06,
	bricksSpan: 0.24,
	brickSize: 20,
	/** Bricks grow past `brickSize` so a large region never builds more than this many per grid. */
	maxBricks: 1200,
	/** The white brick front: peak opacity, lit hold and decay (`wave`). */
	frontPeak: 0.16,
	frontFlash: 0.04,
	frontDecay: 0.14,
	/** The panel's content arrives once the outline has landed (at `carry`). */
	panelContent: 0.18,
} as const;

/**
 * CSS / Web Animations forms of eases, for beats that must not load GSAP (the boot path).
 * Each one reproduces the GSAP curve design-system §7.2 names for that moment.
 */
export const MOTION_CSS_EASES = {
	/** First page load: GSAP `power2.out`, 1 − (1 − t)², which this cubic reproduces to five decimals. */
	firstPageLoad: 'cubic-bezier(0.33333, 0.66667, 0.66667, 1)',
	/** Respawn: linear, the `none` of design-system §7.2. */
	respawn: 'linear',
} as const;
