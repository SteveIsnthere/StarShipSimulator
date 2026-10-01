import type { NavDirection } from './types';

const FOCUSABLE_SELECTOR =
	'button:not([disabled]):not([tabindex="-1"]), ' +
	'a[href]:not([tabindex="-1"]), ' +
	'input:not([disabled]):not([tabindex="-1"]), ' +
	'select:not([disabled]):not([tabindex="-1"]), ' +
	'textarea:not([disabled]):not([tabindex="-1"]), ' +
	'[tabindex]:not([tabindex="-1"])';
const BODY_FOCUSABLE_SELECTOR = FOCUSABLE_SELECTOR
	.split(', ')
	.map(selector => `[data-gp-body] ${selector}`)
	.join(', ');

interface RectInfo {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
	cx: number;
	cy: number;
}

function rectInfo(element: Element): RectInfo {
	const rect = element.getBoundingClientRect();
	return {
		left: rect.left,
		right: rect.right,
		top: rect.top,
		bottom: rect.bottom,
		width: rect.width,
		height: rect.height,
		cx: rect.left + rect.width / 2,
		cy: rect.top + rect.height / 2,
	};
}

function isVisible(element: HTMLElement): boolean {
	const rect = rectInfo(element);
	const style = window.getComputedStyle(element);
	return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function isNativeEditControl(element: HTMLElement): boolean {
	if (element.isContentEditable || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
	if (!(element instanceof HTMLInputElement)) return false;
	const type = (element.getAttribute('type') || element.type || 'text').toLowerCase();
	return ['', 'date', 'datetime-local', 'email', 'month', 'number', 'password', 'search', 'tel', 'text', 'time', 'url', 'week'].includes(type);
}

function focusableIn(root: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
		.filter(element => !element.closest('[aria-hidden="true"], [data-gp-skip]'))
		.filter(element => !isNativeEditControl(element))
		.filter(isVisible);
}

export function firstFocusable(scope: HTMLElement): HTMLElement | null {
	const initial = Array.from(scope.querySelectorAll<HTMLElement>('[data-gp-initial]'))
		.filter(element => element.matches(FOCUSABLE_SELECTOR))
		.filter(element => !element.closest('[aria-hidden="true"], [data-gp-skip]'))
		.filter(element => !isNativeEditControl(element))
		.filter(isVisible);
	if (initial[0]) return initial[0];

	const body = Array.from(scope.querySelectorAll<HTMLElement>(BODY_FOCUSABLE_SELECTOR))
		.filter(element => element.matches(FOCUSABLE_SELECTOR))
		.filter(element => !element.closest('[aria-hidden="true"], [data-gp-skip]'))
		.filter(element => !isNativeEditControl(element))
		.filter(isVisible);
	return body[0] ?? focusableIn(scope)[0] ?? null;
}

export function focusElement(element: HTMLElement): void {
	element.focus({ preventScroll: true });
	element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
	return Math.max(a0, b0) <= Math.min(a1, b1);
}

function directionalDistance(origin: RectInfo, candidate: RectInfo, direction: NavDirection): number {
	switch (direction) {
		case 'right': return candidate.left - origin.right;
		case 'left': return origin.left - candidate.right;
		case 'down': return candidate.top - origin.bottom;
		case 'up': return origin.top - candidate.bottom;
	}
}

function perpendicularDistance(origin: RectInfo, candidate: RectInfo, direction: NavDirection): number {
	return direction === 'left' || direction === 'right' ? Math.abs(candidate.cy - origin.cy) : Math.abs(candidate.cx - origin.cx);
}

function perpendicularOverlap(origin: RectInfo, candidate: RectInfo, direction: NavDirection): boolean {
	return direction === 'left' || direction === 'right'
		? rangesOverlap(origin.top, origin.bottom, candidate.top, candidate.bottom)
		: rangesOverlap(origin.left, origin.right, candidate.left, candidate.right);
}

function isAhead(candidate: RectInfo, origin: RectInfo, direction: NavDirection): boolean {
	switch (direction) {
		case 'right': return candidate.left >= origin.right - 8;
		case 'left': return candidate.right <= origin.left + 8;
		case 'down': return candidate.top >= origin.bottom - 8;
		case 'up': return candidate.bottom <= origin.top + 8;
	}
}

export function spatialNavigate(direction: NavDirection, scope: HTMLElement): void {
	const candidates = focusableIn(scope);
	if (!candidates.length) return;
	const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	if (!focused || !scope.contains(focused)) {
		focusElement(firstFocusable(scope) ?? candidates[0]);
		return;
	}
	const origin = rectInfo(focused);
	const ranked = candidates
		.filter(element => element !== focused)
		.map(element => ({ element, rect: rectInfo(element) }))
		.filter(item => isAhead(item.rect, origin, direction))
		.filter(item => direction === 'up' || direction === 'down' || perpendicularOverlap(origin, item.rect, direction))
		.map(item => ({ element: item.element, score: Math.max(0, directionalDistance(origin, item.rect, direction)) * 4 + perpendicularDistance(origin, item.rect, direction) }))
		.sort((a, b) => a.score - b.score);
	if (ranked[0]) focusElement(ranked[0].element);
}
