/**
 * useChipPanelMorph — a chip's outline grows into the panel it opens, and the
 * panel collapses back into the chip (design-system §7.2, FB-146).
 *
 * One outline does the travelling. The consumer renders an empty shell `div`
 * just before the panel. The shell takes over the panel's own border and
 * backing and tweens `left/top/width/height` between the chip's rect and the
 * panel's rect. Both ends are axis-aligned rectangles, so every edge has an
 * exact partner and nothing is left for a morph plugin to guess.
 *
 * While the shell travels, the real panel sits at its final place with its
 * frame made transparent and its content clipped to the shell
 * (`clip-path: inset`). The content fades in over the last stretch, so nothing
 * arrives before the shape settles. At either end the shell and the panel's
 * own frame swap in the same frame at the same rect, so the handoff composites
 * identically. Closing fades the content out while the shell collapses, keeps
 * the panel mounted and `inert` until the shell lands, then reports it gone.
 *
 * Any toggle mid-flight kills the running tween and starts the next one from
 * the shell's current geometry. Reduced motion skips the shell entirely.
 *
 * Focus into the panel belongs to the panel's own input scope. This hook only
 * returns focus to the chip, as the close starts, when it was in the panel.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { MOTION_DURATIONS, MOTION_EASES } from './tokens';
import { useReducedMotion } from './useReducedMotion';
import { boxOf, frameOf, handBack, handOver, paint, spaceOf, travel, type Box } from './outlineMorph';

export type ChipPanelPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface ChipPanelMorphOptions {
	/** The disclosure state. The panel mounts with it and unmounts once the collapse lands. */
	open: boolean;
	/** The chip that opens the panel. Focus returns here on close. */
	anchorRef: RefObject<HTMLElement | null>;
	/** The panel's outermost element — the one that draws its border. */
	panelRef: RefObject<HTMLElement | null>;
	/** An empty `div` rendered just before the panel, in the same positioning context. */
	shellRef: RefObject<HTMLElement | null>;
}

function returnFocus(panel: HTMLElement | null, anchor: HTMLElement | null): void {
	const active = document.activeElement;
	const lost = !active || active === document.body || (panel?.contains(active) ?? false);
	if (lost) anchor?.focus({ preventScroll: true });
}

/** Returns whether the panel should be rendered; it stays true through the collapse. */
export function useChipPanelMorph({ open, anchorRef, panelRef, shellRef }: ChipPanelMorphOptions): boolean {
	const reduced = useReducedMotion();
	const [mounted, setMounted] = useState(open);
	// Mount synchronously with `open` so the panel is laid out before the first
	// animated frame. Under reduced motion a close unmounts at once as well.
	if (open && !mounted) setMounted(true);
	if (!open && mounted && reduced) setMounted(false);

	const phaseRef = useRef<ChipPanelPhase>(open ? 'open' : 'closed');
	const tlRef = useRef<gsap.core.Animation | null>(null);
	/** The shell's live geometry while a tween runs; null when settled. */
	const boxRef = useRef<Box | null>(null);

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const shell = shellRef.current;
		const anchor = anchorRef.current;

		const settle = (phase: ChipPanelPhase) => {
			tlRef.current = null;
			boxRef.current = null;
			phaseRef.current = phase;
			handBack(shellRef.current, panelRef.current);
		};

		if (reduced && tlRef.current) {
			// The preference flipped mid-flight: land where the tween was heading.
			tlRef.current.progress(1);
		}

		if (open) {
			if (!mounted || !panel) return;
			if (phaseRef.current === 'open' || phaseRef.current === 'opening') return;
			panel.inert = false;
			if (reduced || !shell || !anchor) {
				tlRef.current?.kill();
				settle('open');
				return;
			}
			const resumed = phaseRef.current === 'closing';
			const frame = frameOf(spaceOf(shell));
			const box = boxRef.current ?? boxOf(anchor, frame);
			tlRef.current?.kill();
			phaseRef.current = 'opening';
			boxRef.current = box;
			handOver(shell, panel);
			if (!resumed) panel.style.opacity = '0';
			paint(shell, panel, box, boxOf(panel, frame));
			const { chipOpen, chipContentIn } = MOTION_DURATIONS;
			const tl = gsap.timeline({ paused: !resumed, onComplete: () => settle('open') });
			travel(tl, shell, panel, box, f => boxOf(panel, f), chipOpen, MOTION_EASES.chipOpen);
			tl.to(panel, { opacity: 1, duration: chipContentIn, ease: MOTION_EASES.linear }, chipOpen - chipContentIn);
			tlRef.current = tl;
			if (!resumed) {
				// A fresh panel starts once it has been through a frame. Its first
				// render, effects and paint otherwise land inside the tween's clock and
				// the shell jumps half its travel on the first open (measured: 167 ms,
				// 98 → 577 px in one frame). The shell sits on the chip meanwhile. A
				// reversal of a collapse already has a laid-out panel and turns at once.
				requestAnimationFrame(() => requestAnimationFrame(() => {
					if (tlRef.current === tl) tl.play();
				}));
			}
			return;
		}

		if (phaseRef.current === 'closed' || phaseRef.current === 'closing') return;
		returnFocus(panel, anchor);
		if (!mounted) {
			// Reduced motion already unmounted it during render.
			tlRef.current?.kill();
			settle('closed');
			return;
		}
		const finishClose = () => {
			settle('closed');
			setMounted(false);
		};
		if (!panel || !shell || !anchor) {
			// Nothing to animate between: unmount on the next tick.
			tlRef.current?.kill();
			phaseRef.current = 'closing';
			tlRef.current = gsap.delayedCall(0, finishClose);
			return;
		}
		const frame = frameOf(spaceOf(shell));
		const box = boxRef.current ?? boxOf(panel, frame);
		tlRef.current?.kill();
		phaseRef.current = 'closing';
		panel.inert = true;
		boxRef.current = box;
		handOver(shell, panel);
		paint(shell, panel, box, boxOf(panel, frame));
		const { chipClose, chipContentOut } = MOTION_DURATIONS;
		const tl = gsap.timeline({ onComplete: finishClose });
		tl.to(panel, { opacity: 0, duration: chipContentOut, ease: MOTION_EASES.linear }, 0);
		travel(tl, shell, panel, box, f => boxOf(anchor, f), chipClose, MOTION_EASES.chipClose);
		tlRef.current = tl;
	}, [open, mounted, reduced, anchorRef, panelRef, shellRef]);

	// Nothing may fire into an unmounted tree.
	useLayoutEffect(() => () => {
		tlRef.current?.kill();
		tlRef.current = null;
	}, []);

	return mounted;
}
