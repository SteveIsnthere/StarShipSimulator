import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function subscribeReducedMotion(onChange: () => void): () => void {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
	const media = window.matchMedia(QUERY);
	media.addEventListener('change', onChange);
	return () => media.removeEventListener('change', onChange);
}

function snapshot(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia(QUERY).matches
		: false;
}

export function prefersReducedMotion(): boolean {
	return snapshot();
}

export function useReducedMotion(): boolean {
	return useSyncExternalStore(subscribeReducedMotion, snapshot, () => false);
}
