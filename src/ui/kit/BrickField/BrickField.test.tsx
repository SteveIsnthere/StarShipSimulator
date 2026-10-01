import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrickField } from './BrickField';
import { resetBrickClockForTest } from './brickClock';
import { createBrickRenderer } from './renderer';

vi.mock('./renderer', () => ({ createBrickRenderer: vi.fn() }));

let clock = 0;

let nextFrame = 1;
const frames = new Map<number, FrameRequestCallback>();
let intersectionCallback: IntersectionObserverCallback;
const draw = vi.fn(() => ({ cpuMs: 0.02 }));
const destroy = vi.fn();
const resize = vi.fn();
const disconnectResize = vi.fn();
const disconnectIntersection = vi.fn();

function flushFrame(time = 16) {
	const pending = [...frames.values()];
	frames.clear();
	for (const callback of pending) callback(time);
}

beforeEach(() => {
	frames.clear();
	draw.mockClear(); destroy.mockClear(); resize.mockClear(); disconnectResize.mockClear(); disconnectIntersection.mockClear();
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = nextFrame++; frames.set(id, callback); return id; });
	vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() { disconnectResize(); } });
	vi.stubGlobal('IntersectionObserver', class {
		constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
		observe() { intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); }
		disconnect() { disconnectIntersection(); }
	});
	vi.mocked(createBrickRenderer).mockReset().mockReturnValue({ draw, destroy, layout: resize, build: vi.fn() });
	resetBrickClockForTest();
	clock = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => clock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it('runs one frame chain only while active, visible, and intersecting', () => {
	const { rerender } = render(<BrickField active />);
	expect(frames.size).toBe(1);
	draw.mockClear();
	act(() => flushFrame());
	expect(draw).toHaveBeenCalledOnce();
	expect(frames.size).toBe(1);
	act(() => intersectionCallback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
	expect(frames.size).toBe(0);
	rerender(<BrickField active={false} />);
	expect(frames.size).toBe(0);
});

it('falls back and stops on context loss', () => {
	render(<BrickField active />);
	const canvas = document.querySelector('canvas[data-field-surface="live"]')!;
	const event = new Event('webglcontextlost', { cancelable: true });
	act(() => canvas.dispatchEvent(event));
	expect(event.defaultPrevented).toBe(true);
	expect(frames.size).toBe(0);
	expect(canvas).toHaveClass('invisible');
});

it('releases every owned observer, frame, and renderer under StrictMode', () => {
	const { unmount } = render(<StrictMode><BrickField active /></StrictMode>);
	unmount();
	expect(frames.size).toBe(0);
	expect(disconnectResize).toHaveBeenCalledTimes(2);
	expect(disconnectIntersection).toHaveBeenCalledTimes(2);
	expect(destroy).toHaveBeenCalledTimes(2);
});

it('does not allocate GL for an inactive field', () => {
	const { rerender } = render(<BrickField active={false} />);
	expect(createBrickRenderer).not.toHaveBeenCalled();
	expect(frames.size).toBe(0);
	rerender(<BrickField active />);
	expect(createBrickRenderer).toHaveBeenCalledOnce();
	rerender(<BrickField active={false} />);
	expect(frames.size).toBe(0);
	expect(destroy).toHaveBeenCalledOnce();
});

it('runs on the shared clock, and a pause and resume continue the same build', () => {
	const { rerender } = render(<BrickField active />);
	act(() => flushFrame(500));
	expect(draw).toHaveBeenLastCalledWith(0.5, false);
	clock = 600;
	rerender(<BrickField active={false} />);
	rerender(<BrickField active />);
	act(() => flushFrame(1100));
	expect(draw).toHaveBeenLastCalledWith(1.1, false);
});

it('draws again when a pause resumes into a different settled window', () => {
	render(<BrickField active />);
	act(() => flushFrame(2700));
	draw.mockClear();
	// 2.7 s is the built hold; 5.9 s is the idle rest. Both settled, but they look different.
	act(() => flushFrame(5900));
	expect(draw).toHaveBeenCalledOnce();
});

it('skips frames while the build is settled, and draws again when it moves', () => {
	render(<BrickField active />);
	act(() => flushFrame(2700));
	draw.mockClear();
	// 2.7 s and 2.8 s are both inside the built hold: nothing to draw.
	act(() => flushFrame(2800));
	expect(draw).not.toHaveBeenCalled();
	// 3.1 s: the clear has started.
	act(() => flushFrame(3100));
	expect(draw).toHaveBeenCalledOnce();
});

it('keeps fallback usable after allocation failure', () => {
	vi.mocked(createBrickRenderer).mockImplementation(() => { throw new Error('context unavailable'); });
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	const { container } = render(<BrickField active />);
	expect(frames.size).toBe(0);
	expect(container.querySelector('canvas[data-field-surface="live"]')).toHaveClass('invisible');
	expect(container.querySelector('canvas[data-field-surface="static"]')).not.toHaveClass('invisible');
	warn.mockRestore();
});

it('stops for document visibility and resumes exactly one frame chain', () => {
	let hidden = false;
	vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
	render(<BrickField active />);
	draw.mockClear();
	act(() => flushFrame());
	hidden = true;
	act(() => document.dispatchEvent(new Event('visibilitychange')));
	expect(frames.size).toBe(0);
	act(() => flushFrame(100));
	expect(draw).toHaveBeenCalledOnce();
	hidden = false;
	act(() => { document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('visibilitychange')); });
	expect(frames.size).toBe(1);
});

it('handles a live reduced-motion preference and cleans up the subscription', () => {
	let reduced = false;
	const listeners = new Set<() => void>();
	vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) }));
	const { unmount } = render(<BrickField active />);
	reduced = true;
	act(() => listeners.forEach(listener => listener()));
	expect(frames.size).toBe(0);
	expect(destroy).toHaveBeenCalledOnce();
	reduced = false;
	act(() => listeners.forEach(listener => listener()));
	expect(frames.size).toBe(1);
	unmount();
	expect(listeners.size).toBe(0);
	expect(frames.size).toBe(0);
});

it('restores resources after context loss without drawing while offscreen', () => {
	const { container } = render(<BrickField active />);
	const canvas = container.querySelector('canvas[data-field-surface="live"]')!;
	act(() => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
	act(() => intersectionCallback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
	act(() => canvas.dispatchEvent(new Event('webglcontextrestored')));
	expect(createBrickRenderer).toHaveBeenCalledTimes(2);
	expect(frames.size).toBe(0);
	act(() => { intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
	expect(frames.size).toBe(1);
});

it.each(['inactive', 'reduced'] as const)('does not reallocate after loss then %s then restore', mode => {
	let reduced = false;
	const listeners = new Set<() => void>();
	vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) }));
	const { container, rerender } = render(<BrickField active />);
	const canvas = container.querySelector('canvas[data-field-surface="live"]')!;
	act(() => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
	if (mode === 'inactive') rerender(<BrickField active={false} />);
	else { reduced = true; act(() => listeners.forEach(listener => listener())); }
	act(() => canvas.dispatchEvent(new Event('webglcontextrestored')));
	expect(createBrickRenderer).toHaveBeenCalledOnce();
	expect(frames.size).toBe(0);
});

it('paints a frame whenever it sizes the surface, so a paused field is never blank', () => {
	render(<BrickField active />);
	// Sized and painted at allocation, before any animation frame, at the build's first moment.
	expect(resize).toHaveBeenCalledOnce();
	expect(draw).toHaveBeenCalledExactlyOnceWith(0, false);
	expect(resize.mock.invocationCallOrder[0]).toBeLessThan(draw.mock.invocationCallOrder[0]);
});

it('holds no static frame while WebGL draws, and paints one when the context is lost', () => {
	render(<BrickField active />);
	const staticCanvas = document.querySelector<HTMLCanvasElement>('canvas[data-field-surface="static"]')!;
	expect(staticCanvas.width).toBe(0);
	const live = document.querySelector('canvas[data-field-surface="live"]')!;
	act(() => live.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
	expect(staticCanvas.width).toBeGreaterThan(0);
});
