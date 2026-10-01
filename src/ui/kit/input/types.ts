import type { RefObject } from 'react';

export type NavDirection = 'up' | 'down' | 'left' | 'right';

export interface LegendHint {
	glyph: string;
	label: string;
	kbd?: string;
	tone?: 'neutral' | 'confirm' | 'back';
}

export interface ScopeOpts {
	onBack?: () => void;
	onNextTab?: () => void;
	onPrevTab?: () => void;
	onArrow?: (dir: NavDirection) => boolean;
	/** Let a composite widget such as a listbox handle keyboard arrows itself. */
	keyboardArrowMode?: 'spatial' | 'native';
	hints?: LegendHint[];
}

export interface InputEnvironment {
	isApplicationCaptureActive: () => boolean;
	shouldHandleArrow?: (target: EventTarget | null, direction: NavDirection) => boolean;
	onNavigationActivity?: (active: boolean) => void;
}

export interface GamepadNavContextValue {
	gamepadConnected: boolean;
	navActive: boolean;
	activeHints: LegendHint[];
	hasScope: () => boolean;
	navigate: (dir: NavDirection) => void;
	confirm: () => void;
	back: () => void;
	nextTab: () => void;
	prevTab: () => void;
	scroll: (dx: number, dy: number) => void;
	activateNavMode: () => void;
	registerScope: (el: HTMLElement, optsRef: RefObject<ScopeOpts>, autoFocus?: boolean) => () => void;
	setGamepadConnected: (value: boolean) => void;
}
