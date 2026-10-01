/**
 * The travelling outline shared by the shape morphs (design-system §7.2).
 *
 * One `shell` element takes over a target's own border and backing and tweens
 * `left/top/width/height` between two measured rectangles. Both ends are
 * axis-aligned rectangles, so every edge has an exact partner and nothing is
 * left for a morph plugin to guess: the outline cannot twist. The target is
 * clipped to the shell while it travels, and the two swap back in the same
 * frame at the same rect. Used by `useChipPanelMorph` (FB-146) and the page
 * transition (FB-144).
 */
import gsap from 'gsap';

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Frame {
	left: number;
	top: number;
	kx: number;
	ky: number;
}

export const VIEWPORT: Frame = { left: 0, top: 0, kx: 1, ky: 1 };

/** The element the shell is positioned against, or null for the viewport. Stable for a tween. */
export function spaceOf(shell: HTMLElement): HTMLElement | null {
	if (getComputedStyle(shell).position === 'fixed') return null;
	return shell.offsetParent as HTMLElement | null;
}

/** That space in client coordinates, with any ancestor scale factored out. */
export function frameOf(space: HTMLElement | null): Frame {
	if (!space) return VIEWPORT;
	const rect = space.getBoundingClientRect();
	const kx = space.offsetWidth ? rect.width / space.offsetWidth : 1;
	const ky = space.offsetHeight ? rect.height / space.offsetHeight : 1;
	return { left: rect.left + space.clientLeft * kx, top: rect.top + space.clientTop * ky, kx, ky };
}

export function boxOf(el: Element, frame: Frame): Box {
	const r = el.getBoundingClientRect();
	return { x: (r.left - frame.left) / frame.kx, y: (r.top - frame.top) / frame.ky, w: r.width / frame.kx, h: r.height / frame.ky };
}

export function placeShell(shell: HTMLElement, box: Box): void {
	shell.style.left = `${box.x}px`;
	shell.style.top = `${box.y}px`;
	shell.style.width = `${box.w}px`;
	shell.style.height = `${box.h}px`;
}

/** Draw the shell at `box` and clip the panel to it. `panelBox` shares the shell's frame. */
export function paint(shell: HTMLElement, panel: HTMLElement, box: Box, panelBox: Box): void {
	placeShell(shell, box);
	const top = Math.max(0, box.y - panelBox.y);
	const right = Math.max(0, panelBox.x + panelBox.w - (box.x + box.w));
	const bottom = Math.max(0, panelBox.y + panelBox.h - (box.y + box.h));
	const left = Math.max(0, box.x - panelBox.x);
	panel.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

/**
 * Tween the shell from where it is now to a target measured afresh every frame,
 * so a panel that changes size, or a layout that moves, mid-flight still lands exactly.
 */
export function travel(
	tl: gsap.core.Timeline,
	shell: HTMLElement,
	panel: HTMLElement,
	box: Box,
	target: (frame: Frame) => Box,
	duration: number,
	ease: string,
	at: gsap.Position = 0,
): void {
	const from = { ...box };
	const state = { p: 0 };
	const space = spaceOf(shell);
	tl.to(state, {
		p: 1,
		duration,
		ease,
		onUpdate: () => {
			const frame = frameOf(space);
			const to = target(frame);
			box.x = from.x + (to.x - from.x) * state.p;
			box.y = from.y + (to.y - from.y) * state.p;
			box.w = from.w + (to.w - from.w) * state.p;
			box.h = from.h + (to.h - from.h) * state.p;
			paint(shell, panel, box, boxOf(panel, frame));
		},
	}, at);
}

/** The frame properties the shell carries for its target. Frames are square (design-system §2). */
export interface FrameStyle {
	borderStyle: string;
	borderWidth: string;
	borderColor: string;
	backgroundColor: string;
}

export function frameStyleOf(el: HTMLElement): FrameStyle {
	const style = getComputedStyle(el);
	return {
		borderStyle: style.borderTopStyle,
		borderWidth: style.borderTopWidth,
		borderColor: style.borderTopColor,
		backgroundColor: style.backgroundColor,
	};
}

/** Give the shell a frame, as a box that draws its border inside its rect. */
export function dressShell(shell: HTMLElement, frame: FrameStyle): void {
	shell.style.boxSizing = 'border-box';
	shell.style.borderStyle = frame.borderStyle;
	shell.style.borderWidth = frame.borderWidth;
	shell.style.borderColor = frame.borderColor;
	shell.style.backgroundColor = frame.backgroundColor;
}

/**
 * Hand the panel's frame to the shell: the shell takes the panel's border and
 * backing and the panel's own go transparent, so the two never stack. A panel
 * already handed over (a reversal mid-flight) keeps the shell as it is. Returns
 * the panel's own frame, read before it was made transparent.
 */
export function handOver(shell: HTMLElement, panel: HTMLElement, dress = true): FrameStyle | null {
	let frame: FrameStyle | null = null;
	if (panel.dataset.morphing !== 'true') {
		frame = frameStyleOf(panel);
		if (dress) dressShell(shell, frame);
		panel.style.borderColor = 'transparent';
		panel.style.backgroundColor = 'transparent';
		panel.dataset.morphing = 'true';
	}
	shell.style.visibility = 'visible';
	return frame;
}

/** Give the panel its own frame back and hide the shell, in the same frame. */
export function handBack(shell: HTMLElement | null, panel: HTMLElement | null): void {
	if (shell) shell.style.visibility = 'hidden';
	if (!panel) return;
	panel.style.opacity = '';
	panel.style.clipPath = '';
	panel.style.borderColor = '';
	panel.style.backgroundColor = '';
	delete panel.dataset.morphing;
}
