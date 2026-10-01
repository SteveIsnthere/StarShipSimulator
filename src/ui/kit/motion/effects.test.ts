import { describe, it, expect } from 'vitest';
import gsap from 'gsap';
import { prepDraw, draw, undraw, wave, dissolve, arrive, brickGrid, brickFrontFraction } from './timeline';
import { MOTION_DURATIONS, MOTION_EASES } from './tokens';

describe('motion effects and tokens', () => {
	it('defines consistent motion tokens without literal magic numbers', () => {
		expect(MOTION_DURATIONS.firstPageLoad).toBe(0.28);
		expect(MOTION_DURATIONS.pageTransition).toBe(0.6);
		expect(MOTION_DURATIONS.firstSpawn).toBe(0.8);
		expect(MOTION_DURATIONS.respawn).toBe(0.12);
		expect(MOTION_DURATIONS.chipOpen).toBe(0.22);
		expect(MOTION_DURATIONS.chipClose).toBe(0.14);
		expect(MOTION_EASES.out).toBe('power3.out');
	});

	it('creates draw, undraw, wave, dissolve, and arrive timeline entries', () => {
		const tl = gsap.timeline({ paused: true });
		const target = document.createElement('div');
		const grid = {
			cells: [document.createElement('div'), document.createElement('div')],
			maxD: 2,
		};

		prepDraw(target);
		draw(tl, target, 0);
		undraw(tl, target, 0.5);
		wave(tl, grid, 1.0);
		dissolve(tl, grid, 1.5);
		arrive(tl, target, 2.0);

		expect(tl.duration()).toBeGreaterThan(2.0);
	});
});

describe('brickGrid', () => {
	const svg = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	/** Every brick of a grid as [x, y, w, h], read back from the diagonal paths. */
	const bricksOf = (cells: Element[]) => cells.flatMap(cell =>
		[...(cell.getAttribute('d') ?? '').matchAll(/M(\S+) (\S+)h(\S+)v(\S+)h/g)].map(m => m.slice(1, 5).map(Number)));

	it('draws one hidden path per anti-diagonal, tagged for wave', () => {
		const parent = svg();
		const grid = brickGrid(parent, { width: 30, height: 20, size: 10, fill: 'white' });
		// 3 columns × 2 rows → diagonals 0..3.
		expect(grid.maxD).toBe(3);
		expect(grid.cells).toHaveLength(4);
		expect(parent.childElementCount).toBe(4);
		grid.cells.forEach((cell, d) => {
			expect((cell as unknown as { _d: number })._d).toBe(d);
			expect((cell as HTMLElement).style.opacity).toBe('0');
		});
		// Diagonal 1 holds (1,0) and (0,1).
		expect(bricksOf([grid.cells[1]])).toEqual([[10, 0, 10, 10], [0, 10, 10, 10]]);
	});

	it('tiles the area exactly with no inset, cutting the last row and column', () => {
		const grid = brickGrid(svg(), { width: 25, height: 12, size: 10, fill: 'white' });
		const bricks = bricksOf(grid.cells);
		expect(bricks).toHaveLength(6);
		expect(bricks.reduce((area, [, , w, h]) => area + w * h, 0)).toBe(25 * 12);
		expect(bricks).toContainEqual([20, 10, 5, 2]);
	});

	it('leaves a gap between bricks when inset', () => {
		const grid = brickGrid(svg(), { width: 20, height: 10, size: 10, inset: 1, fill: 'white' });
		expect(bricksOf(grid.cells)).toEqual([[1, 1, 8, 8], [11, 1, 8, 8]]);
	});

	it('tiles from an origin, and a negative inset overlaps neighbours into a cover', () => {
		// The page transition's cover: the on-screen part of a region at a fractional origin.
		const grid = brickGrid(svg(), { x: 12.5, y: 40.25, width: 25, height: 12, size: 10, inset: -0.5, fill: 'black' });
		expect(grid.maxD).toBe(3);
		expect(bricksOf(grid.cells)).toEqual([
			[12, 39.75, 11, 11],
			[22, 39.75, 11, 11], [12, 49.75, 11, 3],
			[32, 39.75, 6, 11], [22, 49.75, 11, 3],
			[32, 49.75, 6, 3],
		]);
	});

	it('places a point on the sweep by its diagonal', () => {
		const grid = brickGrid(svg(), { width: 30, height: 20, size: 10, fill: 'white' });
		expect(brickFrontFraction(grid, 10, 0, 0)).toBe(0);
		expect(brickFrontFraction(grid, 10, 15, 5)).toBeCloseTo(1 / 3);
		expect(brickFrontFraction(grid, 10, 29, 19)).toBe(1);
		// Outside the area clamps to the ends of the sweep.
		expect(brickFrontFraction(grid, 10, -40, -40)).toBe(0);
		expect(brickFrontFraction(grid, 10, 400, 400)).toBe(1);
	});
});
