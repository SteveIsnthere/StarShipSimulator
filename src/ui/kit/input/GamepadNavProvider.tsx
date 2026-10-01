import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GamepadNavContext } from './context';
import { firstFocusable, focusElement, spatialNavigate } from './spatialNavigation';
import type { GamepadNavContextValue, InputEnvironment, LegendHint, NavDirection, ScopeOpts } from './types';

export type { GamepadNavContextValue, InputEnvironment, LegendHint, NavDirection, ScopeOpts } from './types';

const DEFAULT_INPUT_ENVIRONMENT: InputEnvironment = {
	isApplicationCaptureActive: () => false,
};

interface ActiveScope {
	el: HTMLElement;
	optsRef: React.RefObject<ScopeOpts>;
	id: number;
}

function stepRangeInput(element: HTMLInputElement, direction: NavDirection): boolean {
	if (element.type !== 'range' || (direction !== 'left' && direction !== 'right')) return false;
	const parsedMin = Number(element.min);
	const parsedMax = Number(element.max);
	const min = Number.isFinite(parsedMin) ? parsedMin : 0;
	const max = Number.isFinite(parsedMax) ? parsedMax : 100;
	const parsedStep = element.step === 'any' ? (max - min) / 100 : Number(element.step || 1);
	const step = Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 1;
	const current = Number.isFinite(element.valueAsNumber) ? element.valueAsNumber : min;
	const next = Math.min(max, Math.max(min, current + (direction === 'right' ? step : -step)));
	if (next === current) return true;
	element.value = String(next);
	element.dispatchEvent(new Event('input', { bubbles: true }));
	element.dispatchEvent(new Event('change', { bubbles: true }));
	return true;
}

function isNativeEditControl(element: HTMLElement): boolean {
	if (element.isContentEditable || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
	if (!(element instanceof HTMLInputElement)) return false;
	const type = (element.getAttribute('type') || element.type || 'text').toLowerCase();
	return ['', 'date', 'datetime-local', 'email', 'month', 'number', 'password', 'search', 'tel', 'text', 'time', 'url', 'week'].includes(type);
}

function isEditableArrowTarget(target: EventTarget | null, direction: NavDirection): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
	if (!(target instanceof HTMLInputElement) || target.readOnly || target.type === 'range') return false;
	const textLikeTypes = new Set(['', 'email', 'number', 'password', 'search', 'tel', 'text', 'url']);
	return textLikeTypes.has(target.type) && (direction === 'left' || direction === 'right' || target.type === 'number');
}

function findScrollable(from: Element, scope: HTMLElement): Element | null {
	let element: Element | null = from;
	while (element && element !== scope.parentElement) {
		const style = window.getComputedStyle(element);
		const htmlElement = element as HTMLElement;
		if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && htmlElement.scrollHeight > htmlElement.clientHeight) return element;
		if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && htmlElement.scrollWidth > htmlElement.clientWidth) return element;
		element = element.parentElement;
	}
	return null;
}

let scopeIdCounter = 0;

export function GamepadNavProvider({
	children,
	environment = DEFAULT_INPUT_ENVIRONMENT,
}: {
	children: ReactNode;
	environment?: InputEnvironment;
}) {
	const scopeStackRef = useRef<ActiveScope[]>([]);
	const [gamepadConnected, setGamepadConnectedState] = useState(false);
	const [navActive, setNavActiveState] = useState(false);
	const [activeHints, setActiveHints] = useState<LegendHint[]>([]);
	const navActiveRef = useRef(false);

	useEffect(() => () => {
		document.documentElement.removeAttribute('data-gp-nav');
	}, []);

	const syncActiveHints = useCallback(() => {
		const stack = scopeStackRef.current;
		const top = stack.length ? stack[stack.length - 1] : null;
		const next = top?.optsRef.current?.hints ?? [];
		setActiveHints(previous => previous === next ? previous : next);
	}, []);

	const setNavActive = useCallback((active: boolean) => {
		if (navActiveRef.current === active) return;
		navActiveRef.current = active;
		setNavActiveState(active);
		document.documentElement.toggleAttribute('data-gp-nav', active);
		environment.onNavigationActivity?.(active);
	}, [environment]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (environment.isApplicationCaptureActive()) return;
			const topScope = () => scopeStackRef.current[scopeStackRef.current.length - 1];
			if (event.key === 'Escape') {
				const onBack = topScope()?.optsRef.current?.onBack;
				if (!onBack) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				setNavActive(true);
				onBack();
				return;
			}
			if ((event.key === 'Enter' || event.key === ' ') && navActiveRef.current && scopeStackRef.current.length) {
				const scope = topScope();
				const active = document.activeElement;
				if (!(active instanceof HTMLElement) || !scope.el.contains(active) || isNativeEditControl(active)) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				active.click();
				return;
			}
			const direction: NavDirection | null =
				event.key === 'ArrowUp' ? 'up' :
				event.key === 'ArrowDown' ? 'down' :
				event.key === 'ArrowLeft' ? 'left' :
				event.key === 'ArrowRight' ? 'right' : null;
			if (!direction || !scopeStackRef.current.length) return;
			if (isEditableArrowTarget(event.target, direction) || environment.shouldHandleArrow?.(event.target, direction)) return;
			const scope = topScope();
			if (scope.optsRef.current?.keyboardArrowMode === 'native') return;
			event.preventDefault();
			event.stopImmediatePropagation();
			setNavActive(true);
			const consumed = scope.optsRef.current?.onArrow?.(direction) ?? false;
			if (consumed) return;
			const focused = document.activeElement;
			if (focused instanceof HTMLInputElement && stepRangeInput(focused, direction)) return;
			spatialNavigate(direction, scope.el);
		};
		window.addEventListener('keydown', onKeyDown, { capture: true });
		return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
	}, [environment, setNavActive]);

	useEffect(() => {
		let lastX = -1;
		let lastY = -1;
		const onMouseMove = (event: MouseEvent) => {
			if (lastX < 0) { lastX = event.clientX; lastY = event.clientY; return; }
			const moved = Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY);
			lastX = event.clientX;
			lastY = event.clientY;
			if (moved >= 4) setNavActive(false);
		};
		window.addEventListener('mousemove', onMouseMove, { passive: true });
		return () => window.removeEventListener('mousemove', onMouseMove);
	}, [setNavActive]);

	const activeScope = useCallback((): ActiveScope | null => {
		const stack = scopeStackRef.current;
		return stack.length > 0 ? stack[stack.length - 1] : null;
	}, []);
	const hasScope = useCallback(() => scopeStackRef.current.length > 0, []);
	const activateNavMode = useCallback(() => {
		setNavActive(true);
		const scope = activeScope();
		const focused = document.activeElement;
		if (scope && (!focused || !scope.el.contains(focused))) {
			const first = firstFocusable(scope.el);
			if (first) focusElement(first);
		}
	}, [activeScope, setNavActive]);
	const navigate = useCallback((direction: NavDirection) => {
		const scope = activeScope();
		if (!scope) return;
		const consumed = scope.optsRef.current?.onArrow?.(direction) ?? false;
		if (!consumed) spatialNavigate(direction, scope.el);
	}, [activeScope]);
	const confirm = useCallback(() => {
		const active = document.activeElement;
		if (active instanceof HTMLElement) active.click();
	}, []);
	const back = useCallback(() => activeScope()?.optsRef.current?.onBack?.(), [activeScope]);
	const nextTab = useCallback(() => activeScope()?.optsRef.current?.onNextTab?.(), [activeScope]);
	const prevTab = useCallback(() => activeScope()?.optsRef.current?.onPrevTab?.(), [activeScope]);
	const scroll = useCallback((dx: number, dy: number) => {
		const scope = activeScope();
		if (!scope) return;
		const focused = document.activeElement instanceof HTMLElement ? document.activeElement : scope.el;
		findScrollable(focused, scope.el)?.scrollBy(dx, dy);
	}, [activeScope]);

	const registerScope = useCallback((element: HTMLElement, optsRef: React.RefObject<ScopeOpts>, autoFocus?: boolean): (() => void) => {
		const scope: ActiveScope = { el: element, optsRef, id: ++scopeIdCounter };
		let cancelled = false;
		let focusFrame = 0;
		const nextStack = [...scopeStackRef.current];
		const containedIndex = nextStack.findIndex(existing => element.contains(existing.el));
		if (containedIndex >= 0) nextStack.splice(containedIndex, 0, scope);
		else nextStack.push(scope);
		scopeStackRef.current = nextStack;
		syncActiveHints();

		const focusFirstWhenReady = (attemptsLeft: number) => {
			if (cancelled) return;
			const focused = document.activeElement;
			if (focused && element.contains(focused)) return;
			const first = firstFocusable(element);
			if (first) {
				// Bring it into view only for a gamepad pilot, who has to see what is focused;
				// a page opened with a mouse or a finger stays at its top.
				if (navActiveRef.current) focusElement(first);
				else first.focus({ preventScroll: true });
				return;
			}
			if (attemptsLeft > 0) focusFrame = window.requestAnimationFrame(() => focusFirstWhenReady(attemptsLeft - 1));
		};
		// The first attempt waits for the next frame too. Finding a visible target reads
		// layout, and doing that while the scope's commit is still flushing forced a full
		// layout of the half-built page inside that task (FB-177: 47 ms on the phone profile).
		if (navActiveRef.current || autoFocus) focusFrame = window.requestAnimationFrame(() => focusFirstWhenReady(8));

		return () => {
			cancelled = true;
			if (focusFrame) window.cancelAnimationFrame(focusFrame);
			scopeStackRef.current = scopeStackRef.current.filter(existing => existing.id !== scope.id);
			syncActiveHints();
			const nextScope = scopeStackRef.current[scopeStackRef.current.length - 1];
			if (navActiveRef.current && nextScope) {
				window.requestAnimationFrame(() => {
					const focused = document.activeElement;
					if (focused && nextScope.el.contains(focused)) return;
					const first = firstFocusable(nextScope.el);
					if (first) focusElement(first);
				});
			}
		};
	}, [syncActiveHints]);

	const setGamepadConnected = useCallback((connected: boolean) => {
		setGamepadConnectedState(connected);
		if (!connected) setNavActive(false);
	}, [setNavActive]);

	const value = useMemo<GamepadNavContextValue>(() => ({
		gamepadConnected, navActive, activeHints, hasScope, navigate, confirm, back,
		nextTab, prevTab, scroll, activateNavMode, registerScope, setGamepadConnected,
	}), [gamepadConnected, navActive, activeHints, hasScope, navigate, confirm, back, nextTab, prevTab, scroll, activateNavMode, registerScope, setGamepadConnected]);

	return <GamepadNavContext.Provider value={value}>{children}</GamepadNavContext.Provider>;
}
