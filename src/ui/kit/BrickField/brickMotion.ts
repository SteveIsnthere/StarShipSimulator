/**
 * The brick build (FB-278): the screen is a dim grid of square bricks; behind a ragged
 * diagonal front each brick pops in at half size, snaps to full size while its flash steps
 * down, and settles brighter; the built grid holds, then comes apart the same way. Same
 * brick language as the page transition's wave (ui/motion/effects.ts): square bricks,
 * hard edges, state changes in steps.
 *
 * Everything about a brick follows from one number, its order, so a brick's look is a
 * closed-form function of position and time. That is what lets the GPU draw the field in
 * one instanced call (shader.ts mirrors this file line for line) and the 2D still frame
 * match it exactly.
 *
 * ⛔ This module imports nothing: index.html inlines it for the first paint
 * (scripts/lib/loadingStandIn.mjs refuses an import).
 */

/** Brick pitch in CSS px — the page transition's `brickSize` (pinned by a test). */
export const BRICK_SIZE = 20;
/** Gap between bricks in CSS px — the transition's `inset: 1`. */
export const BRICK_GAP = 2;

export interface BrickLayout { cols: number; rows: number; originX: number; originY: number; width: number; height: number; size: number }

/** Bricks covering an area, with a brick boundary through its centre. */
export function brickLayout(width: number, height: number, size = BRICK_SIZE): BrickLayout {
	const w = Math.max(width, 0), h = Math.max(height, 0);
	const originX = ((w / 2) % size) - size;
	const originY = ((h / 2) % size) - size;
	return { cols: Math.ceil((w - originX) / size), rows: Math.ceil((h - originY) / size), originX, originY, width: w, height: h, size };
}

/** One step of a brick's flash: seconds held, opacity, scale (1 = full brick). */
export type BrickStep = readonly [seconds: number, alpha: number, scale: number];

export interface BrickBuild {
	/** Seconds for the build front to cross, the built hold, the clearing front, and the rest before the next build. */
	build: number;
	hold: number;
	clear: number;
	rest: number;
	/** Share of each brick's moment that is random rather than positional (0..1): the sparkle. */
	ragged: number;
	/** Opacity of a brick before it is built, and once built. */
	idle: number;
	built: number;
	/** How a brick arrives, then it holds `built`. */
	land: readonly BrickStep[];
	/** How a brick leaves, then it returns to `idle`. */
	lift: readonly BrickStep[];
}

/** The loading screen's build — "Calmer sparkle", picked by Steve on 2026-09-30. */
export const LOADING_BUILD: BrickBuild = {
	build: 2.4,
	hold: 0.6,
	clear: 2.4,
	rest: 0.6,
	ragged: 0.32,
	idle: 0.05,
	built: 0.12,
	land: [[0.05, 0.6, 0.5], [0.05, 0.4, 0.8], [0.08, 0.22, 1]],
	lift: [[0.05, 0.3, 0.8], [0.05, 0.2, 0.5]],
};

/** Shader limit on flash steps; `assertBuild` enforces it for every build handed to the GPU. */
export const MAX_BRICK_STEPS = 4;

export function buildPeriod(build: BrickBuild): number {
	return build.build + build.hold + build.clear + build.rest;
}

/** A stable per-brick value in [0, 1). */
export function hash(col: number, row: number): number {
	let h = (col * 374761393 + row * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A brick's place in the build, 0 (first) to 1 (last). */
export function brickOrder(col: number, row: number, layout: BrickLayout, build: BrickBuild): number {
	const maxD = Math.max(layout.cols + layout.rows - 2, 1);
	return ((col + row) / maxD) * (1 - build.ragged) + hash(col, row) * build.ragged;
}

export interface BrickLook { alpha: number; scale: number }

function stepAt(steps: readonly BrickStep[], elapsed: number): BrickStep | null {
	let at = 0;
	for (const step of steps) {
		at += step[0];
		if (elapsed < at) return step;
	}
	return null;
}

/** How a brick is drawn at `seconds` into the build. */
export function brickLook(col: number, row: number, seconds: number, layout: BrickLayout, build: BrickBuild): BrickLook {
	const period = buildPeriod(build);
	const local = ((seconds % period) + period) % period;
	const order = brickOrder(col, row, layout, build);
	const landsAt = order * build.build;
	const liftsAt = build.build + build.hold + order * build.clear;
	if (local < landsAt) return { alpha: build.idle, scale: 1 };
	if (local < liftsAt) {
		const step = stepAt(build.land, local - landsAt);
		return step ? { alpha: step[1], scale: step[2] } : { alpha: build.built, scale: 1 };
	}
	const step = stepAt(build.lift, local - liftsAt);
	return step ? { alpha: step[1], scale: step[2] } : { alpha: build.idle, scale: 1 };
}

const stepsTotal = (steps: readonly BrickStep[]) => steps.reduce((sum, [seconds]) => sum + seconds, 0);

/**
 * The settled window `seconds` falls in, or null while bricks are changing: the built hold
 * (after the last landing settles, before the clear) or the idle rest (after the last lift
 * settles, before the next build), keyed by cycle. A renderer skips a frame only when it
 * already shows the same window: the hold and the rest look different, and so does any
 * window after a pause that skipped the motion between them.
 */
export function settledWindow(seconds: number, build: BrickBuild): string | null {
	const period = buildPeriod(build);
	const cycle = Math.floor(seconds / period);
	const local = seconds - cycle * period;
	if (local >= build.build + stepsTotal(build.land) && local < build.build + build.hold) return `${cycle}:hold`;
	if (local >= build.build + build.hold + build.clear + stepsTotal(build.lift)) return `${cycle}:rest`;
	return null;
}

/** The moment shown when the field cannot or should not move: the structure fully built. */
export function stillMoment(build: BrickBuild): number {
	return build.build + Math.min(build.hold, stepsTotal(build.land) + build.hold / 2);
}

export function assertBuild(build: BrickBuild): void {
	if (build.land.length > MAX_BRICK_STEPS || build.lift.length > MAX_BRICK_STEPS) throw new Error(`a brick build has at most ${MAX_BRICK_STEPS} steps per flash`);
	if (stepsTotal(build.land) > build.hold || stepsTotal(build.lift) > build.rest) throw new Error('a brick flash must settle within the hold and rest that follow it');
}

/** The 2D-canvas calls a still frame needs; a CanvasRenderingContext2D satisfies it. */
export interface BrickPainter {
	fillStyle: unknown;
	globalAlpha: number;
	clearRect(x: number, y: number, width: number, height: number): void;
	fillRect(x: number, y: number, width: number, height: number): void;
}

/**
 * Paint one frame in CSS px. It snaps to device pixels exactly as the shader does, so the
 * still frame and the live frame put every brick on the same pixels.
 */
export function paintBricks(painter: BrickPainter, layout: BrickLayout, build: BrickBuild, seconds: number, dpr: number, color: string): void {
	painter.clearRect(0, 0, layout.width, layout.height);
	painter.fillStyle = color;
	const side = layout.size - BRICK_GAP;
	for (let row = 0; row < layout.rows; row++) {
		for (let col = 0; col < layout.cols; col++) {
			const look = brickLook(col, row, seconds, layout, build);
			const size = side * look.scale;
			const x = Math.floor((layout.originX + (col + 0.5) * layout.size - size / 2) * dpr + 0.5) / dpr;
			const y = Math.floor((layout.originY + (row + 0.5) * layout.size - size / 2) * dpr + 0.5) / dpr;
			const sizePx = Math.max(1, Math.floor(size * dpr + 0.5)) / dpr;
			painter.globalAlpha = look.alpha;
			painter.fillRect(x, y, sizePx, sizePx);
		}
	}
	painter.globalAlpha = 1;
}
