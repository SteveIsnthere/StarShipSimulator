import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMotionTimeline } from './useMotionTimeline';
import * as reducedMotionModule from './useReducedMotion';

describe('useMotionTimeline', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('builds a timeline and seeks directly to the end state when reduced motion is preferred', () => {
		vi.spyOn(reducedMotionModule, 'useReducedMotion').mockReturnValue(true);

		const { result } = renderHook(() =>
			useMotionTimeline(tl => {
				tl.to({}, { duration: 1 });
			})
		);

		expect(result.current.timelineRef.current).not.toBeNull();
		expect(result.current.timelineRef.current?.progress()).toBe(1);
	});

	it('kills the timeline on unmount', () => {
		vi.spyOn(reducedMotionModule, 'useReducedMotion').mockReturnValue(false);

		let killSpy: ReturnType<typeof vi.spyOn> | null = null;
		const { result, unmount } = renderHook(() =>
			useMotionTimeline(tl => {
				tl.to({}, { duration: 1 });
				killSpy = vi.spyOn(tl, 'kill');
			})
		);

		expect(result.current.timelineRef.current).not.toBeNull();
		expect(killSpy).not.toHaveBeenCalled();
		unmount();
		expect(killSpy).toHaveBeenCalled();
	});

	it('cancels callbacks on interruption or unmount so stale onComplete never runs', () => {
		vi.spyOn(reducedMotionModule, 'useReducedMotion').mockReturnValue(false);

		const onComplete = vi.fn();
		const { result, unmount } = renderHook(() =>
			useMotionTimeline(tl => {
				tl.to({}, { duration: 1 });
			})
		);

		act(() => {
			result.current.play({ onComplete });
		});

		// Interrupt before completion by unmounting
		unmount();

		expect(onComplete).not.toHaveBeenCalled();
	});
});
