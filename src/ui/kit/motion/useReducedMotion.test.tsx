import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { prefersReducedMotion, useReducedMotion } from './useReducedMotion';

afterEach(() => vi.unstubAllGlobals());

it('updates when the reduced-motion preference changes at runtime', () => {
	let reduced = false;
	const listeners = new Set<() => void>();
	vi.stubGlobal('matchMedia', () => ({
		get matches() { return reduced; },
		media: '(prefers-reduced-motion: reduce)',
		addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
		removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
	}));
	const { result, unmount } = renderHook(() => useReducedMotion());
	expect(result.current).toBe(false);
	reduced = true;
	act(() => listeners.forEach(listener => listener()));
	expect(result.current).toBe(true);
	expect(prefersReducedMotion()).toBe(true);
	unmount();
	expect(listeners.size).toBe(0);
});
