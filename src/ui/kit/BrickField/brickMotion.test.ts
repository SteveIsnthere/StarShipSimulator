import { describe, expect, it } from 'vitest';
import { PAGE_TRANSITION } from '@ui/motion';
import {
	assertBuild, BRICK_GAP, BRICK_SIZE, brickLayout, brickLook, brickOrder, buildPeriod, settledWindow,
	LOADING_BUILD, paintBricks, stillMoment, type BrickPainter,
} from './brickMotion';

const layout = brickLayout(1440, 900);
const period = buildPeriod(LOADING_BUILD);

describe('brick build', () => {
	it('uses the page transition brick, so loading continues the transition', () => {
		expect(BRICK_SIZE).toBe(PAGE_TRANSITION.brickSize);
	});

	it('covers the area with a brick boundary through its centre', () => {
		expect(layout.originX).toBeLessThanOrEqual(0);
		expect(layout.originX + layout.cols * layout.size).toBeGreaterThanOrEqual(1440);
		expect(layout.originY + layout.rows * layout.size).toBeGreaterThanOrEqual(900);
		expect((720 - layout.originX) % layout.size).toBe(0);
		expect((450 - layout.originY) % layout.size).toBe(0);
		expect(brickLayout(0, 0).cols).toBeGreaterThanOrEqual(0);
	});

	it('orders every brick within 0..1 along a diagonal front with bounded sparkle', () => {
		const maxD = layout.cols + layout.rows - 2;
		for (let row = 0; row < layout.rows; row++) for (let col = 0; col < layout.cols; col++) {
			const order = brickOrder(col, row, layout, LOADING_BUILD);
			const position = (col + row) / maxD;
			expect(order).toBeGreaterThanOrEqual(0);
			expect(order).toBeLessThanOrEqual(1);
			// The sparkle never moves a brick more than `ragged` of the build away from its place on the front.
			expect(Math.abs(order - position * (1 - LOADING_BUILD.ragged))).toBeLessThanOrEqual(LOADING_BUILD.ragged);
		}
	});

	it('idles, lands in steps, holds built, lifts in steps and idles again', () => {
		const col = 3, row = 2;
		const order = brickOrder(col, row, layout, LOADING_BUILD);
		const landsAt = order * LOADING_BUILD.build;
		expect(brickLook(col, row, landsAt - 0.001, layout, LOADING_BUILD)).toEqual({ alpha: LOADING_BUILD.idle, scale: 1 });
		expect(brickLook(col, row, landsAt + 0.001, layout, LOADING_BUILD)).toEqual({ alpha: LOADING_BUILD.land[0][1], scale: LOADING_BUILD.land[0][2] });
		expect(brickLook(col, row, LOADING_BUILD.build + 0.3, layout, LOADING_BUILD)).toEqual({ alpha: LOADING_BUILD.built, scale: 1 });
		expect(brickLook(col, row, period - 0.01, layout, LOADING_BUILD)).toEqual({ alpha: LOADING_BUILD.idle, scale: 1 });
		// Every look is a declared step: the motion moves in hard steps, never a fade.
		const declared = new Set([LOADING_BUILD.idle, LOADING_BUILD.built, ...LOADING_BUILD.land.map(s => s[1]), ...LOADING_BUILD.lift.map(s => s[1])]);
		for (let t = 0; t < period; t += 0.004) expect(declared.has(brickLook(col, row, t, layout, LOADING_BUILD).alpha)).toBe(true);
	});

	it('only reports settled when no brick can change, so skipping those frames is invisible', () => {
		const snapshot = (t: number) => {
			const looks: string[] = [];
			for (let row = 0; row < layout.rows; row += 2) for (let col = 0; col < layout.cols; col += 2) looks.push(JSON.stringify(brickLook(col, row, t, layout, LOADING_BUILD)));
			return looks.join('|');
		};
		let settled = 0;
		for (let t = 0; t < period * 2; t += 1 / 60) {
			const current = settledWindow(t, LOADING_BUILD);
			if (current === null || settledWindow(t + 1 / 60, LOADING_BUILD) !== current) continue;
			settled += 1;
			expect(snapshot(t + 1 / 60)).toBe(snapshot(t));
		}
		expect(settled).toBeGreaterThan(period * 60 * 0.1);
		// The hold and the rest are both settled but look different: they are different windows.
		const hold = LOADING_BUILD.build + LOADING_BUILD.hold - 0.01;
		const rest = period - 0.01;
		expect(settledWindow(hold, LOADING_BUILD)).not.toBe(settledWindow(rest, LOADING_BUILD));
		expect(snapshot(hold)).not.toBe(snapshot(rest));
	});

	it('shows the structure fully built when it cannot move', () => {
		const t = stillMoment(LOADING_BUILD);
		for (let row = 0; row < layout.rows; row += 3) for (let col = 0; col < layout.cols; col += 3) {
			expect(brickLook(col, row, t, layout, LOADING_BUILD)).toEqual({ alpha: LOADING_BUILD.built, scale: 1 });
		}
	});

	it('refuses a build the shader cannot draw or whose flash outlasts its hold', () => {
		expect(() => assertBuild(LOADING_BUILD)).not.toThrow();
		expect(() => assertBuild({ ...LOADING_BUILD, land: [...LOADING_BUILD.land, ...LOADING_BUILD.land] })).toThrow();
		expect(() => assertBuild({ ...LOADING_BUILD, hold: 0.05 })).toThrow();
	});

	it('paints whole-device-pixel bricks, one per grid cell', () => {
		const rects: [number, number, number, number][] = [];
		const painter: BrickPainter = { fillStyle: '', globalAlpha: 1, clearRect() {}, fillRect(x, y, w, h) { rects.push([x, y, w, h]); } };
		const small = brickLayout(200, 120);
		paintBricks(painter, small, LOADING_BUILD, stillMoment(LOADING_BUILD), 2, 'white');
		expect(rects).toHaveLength(small.cols * small.rows);
		for (const [x, y, w] of rects) {
			expect(Number.isInteger(x * 2)).toBe(true);
			expect(Number.isInteger(y * 2)).toBe(true);
			expect(w).toBe(BRICK_SIZE - BRICK_GAP);
		}
		expect(painter.globalAlpha).toBe(1);
	});
});
