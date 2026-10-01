/**
 * Shared motion effects ported from the motion reference specification.
 * Registers GSAP plugins once and exports pure SVG and timeline animation builders.
 */
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MOTION_DURATIONS, MOTION_EASES } from './tokens';

// Register plugins once inside the motion module
gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);

export interface BrickGrid {
	cells: (SVGElement | HTMLElement)[];
	maxD: number;
}

export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface BrickGridOptions {
	/** Top-left corner of the tiled area, in the parent's user units. Defaults to the origin. */
	x?: number;
	y?: number;
	/** The area the bricks tile, in the parent's user units. */
	width: number;
	height: number;
	/** Brick pitch. The last row and column are cut to the area. */
	size: number;
	/**
	 * Shrinks each brick on every side, leaving a `2 × inset` gap between bricks. A small
	 * negative inset overlaps neighbours into a seamless cover.
	 */
	inset?: number;
	fill: string;
}

/**
 * Tiles an area with square bricks for `wave` / `dissolve`, with the front running
 * top-left → bottom-right. Every brick on one anti-diagonal switches at the same
 * instant, so each diagonal is ONE `<path>`: a 300 × 160 area at 12 px is 37 nodes and
 * 37 steps per effect instead of 364 of each. The paths start hidden.
 *
 * It is the one brick helper: the page transition (M2) and the HUD power-up (M3) both
 * build on it. Edges are the caller's call: set `shape-rendering` on `parent` when the
 * bricks must stay hard-edged at fractional positions.
 */
export function brickGrid(parent: SVGElement, { x: originX = 0, y: originY = 0, width, height, size, inset = 0, fill }: BrickGridOptions): BrickGrid {
	const cols = Math.max(1, Math.ceil(width / size));
	const rows = Math.max(1, Math.ceil(height / size));
	const maxD = cols + rows - 2;
	const cells: SVGElement[] = [];
	for (let d = 0; d <= maxD; d += 1) {
		let path = '';
		for (let r = Math.max(0, d - cols + 1); r <= Math.min(rows - 1, d); r += 1) {
			const c = d - r;
			const x = originX + c * size + inset;
			const y = originY + r * size + inset;
			const w = Math.min(size, width - c * size) - inset * 2;
			const h = Math.min(size, height - r * size) - inset * 2;
			if (w > 0 && h > 0) path += `M${x} ${y}h${w}v${h}h${-w}z`;
		}
		const cell = document.createElementNS(SVG_NS, 'path');
		cell.setAttribute('d', path);
		cell.setAttribute('fill', fill);
		(cell as unknown as { _d: number })._d = d;
		parent.appendChild(cell);
		cells.push(cell);
	}
	gsap.set(cells, { opacity: 0 });
	return { cells, maxD };
}

/** The diagonal of a `brickGrid` a point falls on, as a fraction of the sweep (0 first, 1 last). */
export function brickFrontFraction(grid: BrickGrid, size: number, x: number, y: number): number {
	if (!grid.maxD) return 0;
	const d = Math.max(0, Math.floor(x / size)) + Math.max(0, Math.floor(y / size));
	return Math.min(1, d / grid.maxD);
}

/** Prepares stroke targets to be traced on by setting drawSVG to 0%. */
export function prepDraw(targets: gsap.TweenTarget): void {
	gsap.set(targets, { drawSVG: '0%' });
}

/** Draws strokes on along their path. */
export function draw(
	tl: gsap.core.Timeline,
	targets: gsap.TweenTarget,
	at?: gsap.Position,
	options: { duration?: number; stagger?: number; ease?: string } = {},
): void {
	tl.to(
		targets,
		{
			drawSVG: '100%',
			duration: options.duration ?? 0.45,
			ease: options.ease ?? MOTION_EASES.inOut,
			stagger: options.stagger ?? 0.04,
		},
		at,
	);
}

/** Undraws strokes to empty. */
export function undraw(
	tl: gsap.core.Timeline,
	targets: gsap.TweenTarget,
	at?: gsap.Position,
	options: { duration?: number; ease?: string } = {},
): void {
	tl.to(
		targets,
		{
			drawSVG: '100% 100%',
			duration: options.duration ?? 0.15,
			ease: options.ease ?? MOTION_EASES.in,
		},
		at,
	);
}

/**
 * Sweeps a hard-edged brick front across a grid.
 * Each brick switches on and off with discrete set steps, never soft opacity fades.
 */
export function wave(
	tl: gsap.core.Timeline,
	grid: BrickGrid,
	at: number | string = 0,
	options: { span?: number; peak?: number; settle?: number; flash?: number; decay?: number } = {},
): void {
	const span = options.span ?? 0.35;
	const peak = options.peak ?? 0.85;
	const settle = options.settle ?? 0;
	const flash = options.flash ?? 0.06;
	const decay = options.decay ?? 0.3;
	const lit = flash + decay * 0.4;
	const atNum = typeof at === 'number' ? at : 0;

	for (const b of grid.cells) {
		const d = (b as unknown as { _d?: number })._d ?? 0;
		const t = atNum + span * (grid.maxD ? d / grid.maxD : 0);
		tl.set(b, { opacity: peak }, t);
		tl.set(b, { opacity: settle }, t + lit);
	}
}

/**
 * Dissolves a brick grid brick by brick along the diagonal.
 */
export function dissolve(
	tl: gsap.core.Timeline,
	grid: BrickGrid,
	at: number | string = 0,
	options: { span?: number } = {},
): void {
	const span = options.span ?? 0.45;
	const atNum = typeof at === 'number' ? at : 0;
	gsap.set(grid.cells, { opacity: 1 });
	for (const b of grid.cells) {
		const d = (b as unknown as { _d?: number })._d ?? 0;
		const t = atNum + span * (grid.maxD ? d / grid.maxD : 0);
		tl.set(b, { opacity: 0 }, t);
	}
}

/**
 * Text arrival effect: slight rise + opacity fade.
 */
export function arrive(
	tl: gsap.core.Timeline,
	targets: gsap.TweenTarget,
	at?: gsap.Position,
	options: { stagger?: number; rise?: number; duration?: number; ease?: string } = {},
): void {
	const rise = options.rise ?? 6;
	gsap.set(targets, { opacity: 0, y: rise });
	tl.to(
		targets,
		{
			opacity: 1,
			y: 0,
			duration: options.duration ?? MOTION_DURATIONS.readingArrival,
			ease: options.ease ?? MOTION_EASES.label,
			stagger: options.stagger ?? 0.04,
		},
		at,
	);
}
