import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@ui/motion';
import { cn } from '@ui/internal/utils';
import { holdBrickClock, brickClockSeconds } from './brickClock';
import { brickLayout, LOADING_BUILD, settledWindow, stillMoment, type BrickBuild } from './brickMotion';
import { createBrickRenderer, type BrickDrawMetric, type BrickRenderer } from './renderer';
import { paintStaticBricks } from './staticBricks';

export interface BrickFieldMetric extends BrickDrawMetric {
	frame: number;
	intervalMs?: number;
}

export interface BrickFieldProps {
	active: boolean;
	/** The motion. Keep the object stable: a new one restarts the renderer. */
	build?: BrickBuild;
	className?: string;
	onMetric?: (metric: BrickFieldMetric) => void;
	onRunningChange?: (running: boolean) => void;
}

function colorChannels(color: string): [number, number, number] {
	const channels = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [255, 255, 255];
	return [channels[0] / 255, channels[1] / 255, channels[2] / 255];
}

/**
 * The brick field fills its container — position it (e.g. `absolute inset-0`). It animates
 * on the GPU in one instanced draw per frame, skips frames while no brick changes, and runs
 * only while active, visible, on screen and allowed to move. Otherwise it shows a still
 * frame of the built structure, painted in 2D from the same maths.
 */
export function BrickField({ active, build = LOADING_BUILD, className, onMetric, onRunningChange }: BrickFieldProps) {
	const reduced = useReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	const staticRef = useRef<HTMLCanvasElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [fallback, setFallback] = useState(true);
	const metricRef = useRef(onMetric);
	const runningRef = useRef(onRunningChange);
	useEffect(() => { metricRef.current = onMetric; }, [onMetric]);
	useEffect(() => { runningRef.current = onRunningChange; }, [onRunningChange]);

	useLayoutEffect(() => {
		const root = rootRef.current;
		const staticCanvas = staticRef.current;
		const canvas = canvasRef.current;
		if (!root || !staticCanvas || !canvas) return;
		const releaseClock = holdBrickClock();
		let renderer: BrickRenderer | null = null;
		let frameId = 0;
		let frame = 0;
		let lastFrameAt = 0;
		let intersecting = false;
		let contextHealthy = true;
		let running = false;
		/** The settled window the last drawn frame showed: later frames in that window look identical. */
		let shownWindow: string | null = null;

		const setRunning = (next: boolean) => {
			if (running === next) return;
			running = next;
			runningRef.current?.(next);
		};
		const stop = () => {
			if (frameId) cancelAnimationFrame(frameId);
			frameId = 0;
			setRunning(false);
		};
		const live = () => renderer !== null && contextHealthy;
		const canRun = () => active && !reduced && !document.hidden && intersecting && live();
		const draw = (now: number, sample = false) => {
			if (!renderer) return;
			const seconds = brickClockSeconds(now);
			const metric = renderer.draw(seconds, sample);
			shownWindow = settledWindow(seconds, build);
			frame += 1;
			metricRef.current?.({ ...metric, frame, intervalMs: lastFrameAt ? now - lastFrameAt : undefined });
			lastFrameAt = now;
		};
		const tick = (now: number) => {
			frameId = 0;
			if (!canRun()) { stop(); return; }
			const settled = settledWindow(brickClockSeconds(now), build);
			if (settled === null || settled !== shownWindow) {
				draw(now, import.meta.env.DEV && metricRef.current !== undefined && frame % 120 === 0);
			}
			frameId = requestAnimationFrame(tick);
		};
		const reconcile = () => {
			if (canRun()) {
				if (!frameId) {
					lastFrameAt = 0;
					setRunning(true);
					frameId = requestAnimationFrame(tick);
				}
			} else stop();
		};
		const resize = () => {
			const rect = root.getBoundingClientRect();
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			if (!live()) {
				paintStaticBricks(staticCanvas, rect.width, rect.height, dpr, build, stillMoment(build), getComputedStyle(root).color);
				return;
			}
			// The live surface draws every frame; the still frame's backing store is released.
			staticCanvas.width = 0;
			staticCanvas.height = 0;
			renderer?.layout(brickLayout(rect.width, rect.height), dpr);
			// Resizing clears the surface: repaint now, so a paused field never shows blank.
			draw(performance.now());
		};
		const create = () => {
			try {
				renderer = createBrickRenderer(canvas, colorChannels(getComputedStyle(root).color));
				renderer.build(build);
				setFallback(false);
			} catch (error) {
				renderer = null;
				setFallback(true);
				if (import.meta.env.DEV) console.warn('BrickField using its still frame:', error);
			}
			resize();
		};
		const onVisibility = () => reconcile();
		const onLost = (event: Event) => {
			event.preventDefault();
			contextHealthy = false;
			stop();
			setFallback(true);
			resize();
		};
		const onRestored = () => {
			renderer?.destroy();
			renderer = null;
			contextHealthy = true;
			if (active && !reduced) create();
			reconcile();
		};
		const resizeObserver = new ResizeObserver(resize);
		const intersectionObserver = new IntersectionObserver(entries => {
			intersecting = entries[entries.length - 1]?.isIntersecting ?? false;
			reconcile();
		});
		resizeObserver.observe(root);
		intersectionObserver.observe(root);
		document.addEventListener('visibilitychange', onVisibility);
		canvas.addEventListener('webglcontextlost', onLost);
		canvas.addEventListener('webglcontextrestored', onRestored);
		if (active && !reduced) create();
		else resize();
		reconcile();
		return () => {
			stop();
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			canvas.removeEventListener('webglcontextlost', onLost);
			canvas.removeEventListener('webglcontextrestored', onRestored);
			renderer?.destroy();
			releaseClock();
		};
	}, [active, reduced, build]);

	const moving = !fallback && active && !reduced;
	return (
		<div ref={rootRef} className={cn('relative overflow-hidden bg-ui-bg', className)} aria-hidden="true">
			<canvas ref={staticRef} data-field-surface="static" className={cn('absolute inset-0 h-full w-full', moving && 'invisible')} />
			<canvas ref={canvasRef} data-field-surface="live" className={cn('absolute inset-0 h-full w-full', !moving && 'invisible')} />
		</div>
	);
}
