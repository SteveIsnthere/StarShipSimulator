import { useEffect, useRef, useCallback, type DependencyList, type RefObject } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export interface MotionTimelineControls {
	/** Plays the timeline from its current position, or seeks directly to the end under reduced motion. */
	play: (options?: { onComplete?: () => void }) => void;
	/** Reverses the timeline, or seeks directly to the beginning under reduced motion. */
	reverse: (options?: { onComplete?: () => void }) => void;
	/** Seeks immediately to the settled end state. */
	seekEnd: () => void;
	/** Kills the timeline and halts all executing animations and callbacks. */
	kill: () => void;
	/** Reference to the underlying GSAP timeline. */
	timelineRef: RefObject<gsap.core.Timeline | null>;
}

export function useMotionTimeline(
	factory: (tl: gsap.core.Timeline) => void,
	deps: DependencyList = [],
	scopeRef?: RefObject<Element | null>,
): MotionTimelineControls {
	const tlRef = useRef<gsap.core.Timeline | null>(null);
	const reducedMotion = useReducedMotion();
	const activeCallbackRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			const tl = gsap.timeline({
				paused: true,
			});
			tlRef.current = tl;
			factory(tl);

			if (reducedMotion) {
				tl.progress(1);
			}
		}, scopeRef?.current ?? undefined);

		return () => {
			activeCallbackRef.current = null;
			if (tlRef.current) {
				tlRef.current.kill();
				tlRef.current = null;
			}
			ctx.revert();
		};
	}, [...deps, reducedMotion]);

	const play = useCallback((options?: { onComplete?: () => void }) => {
		const tl = tlRef.current;
		if (!tl) return;
		activeCallbackRef.current = options?.onComplete ?? null;

		if (reducedMotion) {
			tl.progress(1);
			const cb = activeCallbackRef.current;
			activeCallbackRef.current = null;
			cb?.();
			return;
		}

		if (options?.onComplete) {
			tl.eventCallback('onComplete', () => {
				const cb = activeCallbackRef.current;
				activeCallbackRef.current = null;
				cb?.();
			});
		}
		tl.play();
	}, [reducedMotion]);

	const reverse = useCallback((options?: { onComplete?: () => void }) => {
		const tl = tlRef.current;
		if (!tl) return;
		activeCallbackRef.current = options?.onComplete ?? null;

		if (reducedMotion) {
			tl.progress(0);
			const cb = activeCallbackRef.current;
			activeCallbackRef.current = null;
			cb?.();
			return;
		}

		if (options?.onComplete) {
			tl.eventCallback('onReverseComplete', () => {
				const cb = activeCallbackRef.current;
				activeCallbackRef.current = null;
				cb?.();
			});
		}
		tl.reverse();
	}, [reducedMotion]);

	const seekEnd = useCallback(() => {
		const tl = tlRef.current;
		if (!tl) return;
		activeCallbackRef.current = null;
		tl.progress(1);
	}, []);

	const kill = useCallback(() => {
		activeCallbackRef.current = null;
		if (tlRef.current) {
			tlRef.current.kill();
			tlRef.current = null;
		}
	}, []);

	return { play, reverse, seekEnd, kill, timelineRef: tlRef };
}
