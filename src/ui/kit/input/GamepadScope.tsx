/**
 * GamepadScope — registers a DOM subtree as the active gamepad navigation scope.
 *
 * The innermost mounted scope receives all D-pad / left-stick navigation,
 * A (confirm), B (back), LB/RB (prev/next tab), and right-stick scroll.
 *
 * Uses a stable opts ref so onBack / onNextTab / onPrevTab are always current
 * even if the parent re-renders, without the scope needing to re-register.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import type { ScopeOpts } from './types';
import { useInputContext } from './useInputContext';

export interface GamepadScopeProps extends ScopeOpts {
	children: ReactNode;
	/**
	 * When true, the first focusable element inside this scope is focused as soon
	 * as the scope mounts — even if the user hasn't yet used a gamepad or arrow
	 * key. Use this on modal dialogs / menus so keyboard nav works immediately.
	 */
	autoFocus?: boolean;
	/**
	 * When false the subtree stays mounted but is not a scope: Back, arrows and
	 * hints go to the scope beneath. For a panel that is animating away. Turning it
	 * back on registers again, and `autoFocus` applies again. Defaults to true.
	 */
	active?: boolean;
}

export function GamepadScope({ children, onBack, onNextTab, onPrevTab, onArrow, keyboardArrowMode, hints, autoFocus, active = true }: GamepadScopeProps) {
	const ref = useRef<HTMLDivElement>(null);
	const { registerScope } = useInputContext();

	// Keep opts current without re-triggering registration
	const optsRef = useRef<ScopeOpts>({ onBack, onNextTab, onPrevTab, onArrow, keyboardArrowMode, hints });
	useEffect(() => {
		optsRef.current = { onBack, onNextTab, onPrevTab, onArrow, keyboardArrowMode, hints };
	});

	useEffect(() => {
		const el = ref.current;
		if (!el || !active) return;
		return registerScope(el, optsRef, autoFocus);
	// registerScope is stable; opts + autoFocus are read when (re)registering.
	}, [registerScope, active]);

	// `display: contents` so this wrapper is invisible in layout
	return (
		<div ref={ref} className="contents" data-gp-scope>
			{children}
		</div>
	);
}
