/**
 * The page transition beat (FB-144; design-system §7.2, the approved reference
 * `docs/design/motion/reference/scene-transition.js`).
 *
 * It plays on the live pages, not on a copy. Pages opt in with the marks in
 * `pageTransitionParts.ts`.
 *
 * 1. `exit`: the pressed element's frame is taken by a shell in an overlay
 *    layer and flashes white. The exit page goes `inert` and `aria-hidden`, its
 *    content fades, and its marked outlines undraw in the overlay. `onGone`
 *    fires once the content is gone; the caller changes the route then.
 * 2. `hide`: called between the destination's commit and its first paint.
 * 3. `enter`: the shell travels onto the destination's `panel` (the M4 outline
 *    geometry, so it cannot twist), the panel's content arrives inside it, the
 *    `fill` region's border draws on while it fills in as a hard-edged brick
 *    wave, and `arrive` content rises in.
 * 4. `teardown`: kills every tween and removes every style the beat wrote, in
 *    one frame. The natural end calls it too, so the settled page is exactly
 *    the page a direct load shows. Cancellation and reduced motion use it as is.
 */
import gsap from 'gsap';
import { MOTION_EASES, PAGE_TRANSITION as T } from './tokens';
import { arrive, brickGrid, dissolve, draw, prepDraw, SVG_NS, undraw, wave } from './effects';
import { boxOf, dressShell, frameStyleOf, handBack, handOver, placeShell, travel, VIEWPORT, type Box, type FrameStyle } from './outlineMorph';
import { pageTransitionSelector } from './pageTransitionParts';

/**
 * Whether a computed colour is fully opaque. A serialised colour carries its alpha after a
 * slash (`color(display-p3 r g b / a)`, `oklch(l c h / a)`) or as the fourth argument of the
 * legacy comma form; with neither it is opaque.
 */
function isOpaque(color: string): boolean {
	if (color === 'transparent') return false;
	const alpha = (value: string) => parseFloat(value) / (value.trim().endsWith('%') ? 100 : 1);
	const slash = color.lastIndexOf('/');
	if (slash >= 0) return alpha(color.slice(slash + 1)) >= 1;
	const args = color.slice(color.indexOf('(') + 1, color.lastIndexOf(')')).split(',');
	return args.length < 4 || alpha(args[3]!) >= 1;
}

/** The first opaque backing at or above `el`, which is what a cover must match. */
function backingOf(el: HTMLElement): string {
	for (let node: HTMLElement | null = el; node; node = node.parentElement) {
		const color = getComputedStyle(node).backgroundColor;
		if (isOpaque(color)) return color;
	}
	return getComputedStyle(document.documentElement).getPropertyValue('--color-ui-bg').trim() || 'black';
}

function intersect(a: Box, b: Box): Box | null {
	const x = Math.max(a.x, b.x);
	const y = Math.max(a.y, b.y);
	const w = Math.min(a.x + a.w, b.x + b.w) - x;
	const h = Math.min(a.y + a.h, b.y + b.h) - y;
	return w > 0 && h > 0 ? { x, y, w, h } : null;
}

function viewportBox(): Box {
	return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
}

export class PageTransitionBeat {
	private readonly layer: HTMLDivElement;
	private readonly svg: SVGSVGElement;
	private readonly shell: HTMLDivElement;
	private readonly timelines: gsap.core.Timeline[] = [];
	/** Inline values to put back, newest last. */
	private readonly undo: (() => void)[] = [];
	/** Elements hidden until the hand-off, with their prior inline opacity. */
	private readonly concealed = new Map<HTMLElement, string>();
	/** The destination's parts and their ancestors, which stay visible. */
	private path = new Set<Element>();
	/** Visible nodes whose other children are hidden, including any that mount later. */
	private guarded = new Set<Element>();
	private observer: MutationObserver | null = null;
	private shellBox: Box | null = null;
	private panel: HTMLElement | null = null;
	/** The press flash: a fill inside the shell, so it settles independently of the shell's own backing. */
	private readonly flash: HTMLDivElement;
	private torn = false;

	constructor(host: HTMLElement = document.body) {
		this.layer = document.createElement('div');
		this.layer.setAttribute('aria-hidden', 'true');
		this.layer.dataset.pageTransitionLayer = '';
		Object.assign(this.layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 'var(--z-overlay-portal)', contain: 'strict' });
		this.svg = document.createElementNS(SVG_NS, 'svg');
		Object.assign(this.svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible' });
		this.shell = document.createElement('div');
		Object.assign(this.shell.style, { position: 'fixed', visibility: 'hidden' });
		this.flash = document.createElement('div');
		Object.assign(this.flash.style, { position: 'absolute', inset: '0', opacity: '0' });
		this.shell.appendChild(this.flash);
		this.layer.append(this.svg, this.shell);
		host.appendChild(this.layer);
	}

	/**
	 * Leave `root` from the pressed `source`. The press answers at once; the content fades once
	 * `ready` settles (the destination's code has arrived), so a slow download holds the page
	 * where it is instead of a blank screen. `onGone` fires when the content has faded.
	 */
	exit(root: HTMLElement, source: HTMLElement, onGone: () => void, ready: Promise<unknown> = Promise.resolve()): void {
		const press = this.timeline();
		const tl = this.timeline();
		const sourceFrame = frameStyleOf(source);
		const fg = getComputedStyle(root).color;
		this.shellBox = boxOf(source, VIEWPORT);
		// Clear until it travels: the pressed tile shows through it while it fades with the page.
		dressShell(this.shell, { ...sourceFrame, backgroundColor: 'transparent' });
		this.flash.style.backgroundColor = fg;
		placeShell(this.shell, this.shellBox);
		this.shell.style.visibility = 'visible';

		this.setAttribute(root, 'aria-hidden', 'true');
		this.setAttribute(root, 'inert', '');

		const content = Array.from(root.children).filter((el): el is HTMLElement => el instanceof HTMLElement);
		this.trackStyles(content, ['opacity']);
		tl.to(content, { opacity: 0, duration: T.contentOut, ease: MOTION_EASES.in }, 0);

		const outlines = Array.from(root.querySelectorAll<HTMLElement>(pageTransitionSelector('outline')))
			.filter(el => el !== source && !el.contains(source) && !source.contains(el))
			.map(el => this.outlineOf(el))
			.filter((rect): rect is SVGRectElement => rect !== null);
		if (outlines.length) {
			gsap.set(outlines, { drawSVG: '0% 100%' });
			undraw(tl, outlines, T.outlinesOutAt, { duration: T.outlinesOut });
		}

		// The press: a white fill brightens over the tile (its text fading under it), then settles.
		press.to(this.flash, { opacity: 1, duration: T.flashOn, ease: MOTION_EASES.linear }, 0);
		press.to(this.flash, { opacity: 0, duration: T.flashOff, ease: 'power2.out' }, T.flashOn);
		press.play();
		tl.call(onGone, [], T.contentOut);
		const go = () => { if (!this.torn) tl.play(); };
		ready.then(go, go);
	}

	/** Hide the destination before its first paint. Call from a commit-time observer. */
	hide(root: HTMLElement): void {
		for (const el of Array.from(root.children)) if (el instanceof HTMLElement) this.conceal(el);
		this.guarded = new Set([root]);
		// Content that mounts during the beat (a late error banner) waits for the hand-off too.
		this.observer = new MutationObserver(records => {
			for (const record of records) {
				if (!this.guarded.has(record.target as Element)) continue;
				for (const node of Array.from(record.addedNodes)) {
					if (node instanceof HTMLElement && !this.path.has(node)) this.conceal(node);
				}
			}
		});
		this.observer.observe(root, { childList: true, subtree: true });
	}

	/**
	 * Enter `root`. Returns false, having changed nothing, when the page marks no
	 * panel; the caller then tears the beat down and the page shows as it is.
	 */
	enter(root: HTMLElement, onSettled: () => void): boolean {
		const panel = root.querySelector<HTMLElement>(pageTransitionSelector('panel'));
		if (!panel || !this.shellBox) return false;
		const fill = root.querySelector<HTMLElement>(pageTransitionSelector('fill'));
		const arriving = Array.from(root.querySelectorAll<HTMLElement>(pageTransitionSelector('arrive')));
		this.concealAllBut(root, [panel, ...(fill ? [fill] : []), ...arriving]);

		const tl = this.timeline(false);
		this.panel = panel;
		const panelFrame = handOver(this.shell, panel, false) ?? frameStyleOf(panel);
		panel.style.opacity = '0';
		travel(tl, this.shell, panel, this.shellBox, frame => boxOf(panel, frame), T.carry, T.carryEase, 0);
		// The frame turns into the panel's, and its backing fills in, so the outline passes over
		// the arriving page rather than through it. The press flash settles on its own layer inside.
		tl.to(this.shell, { borderColor: panelFrame.borderColor, borderWidth: panelFrame.borderWidth, backgroundColor: panelFrame.backgroundColor, duration: T.carry, ease: T.carryEase }, 0);
		// The outline lands and hands the panel its own frame while the panel is still empty, so
		// the swap is exact even where the panel's content later paints over its border. The
		// content then arrives on the page itself.
		tl.call(() => handBack(this.shell, panel), [], T.carry);
		tl.fromTo(panel, { opacity: 0 }, {
			opacity: 1, duration: T.panelContent, ease: MOTION_EASES.out, immediateRender: false,
			// Drop the inline value as soon as it is done, so the panel paints as the page does.
			onComplete: () => { gsap.set(panel, { clearProps: 'opacity' }); },
		}, T.carry);

		if (fill) this.fillIn(tl, fill, getComputedStyle(root).color);
		if (arriving.length) {
			this.trackStyles(arriving, ['opacity', 'transform', 'translate']);
			arrive(tl, arriving, T.arriveAt, { rise: T.arriveRise, stagger: T.arriveStagger });
		}
		tl.eventCallback('onComplete', () => {
			this.teardown();
			onSettled();
		});
		tl.play();
		return true;
	}

	/** Back to the pages as they are, now: no tween left, no style left, no layer. Idempotent. */
	teardown(): void {
		if (this.torn) return;
		this.torn = true;
		for (const tl of this.timelines) tl.kill();
		this.observer?.disconnect();
		gsap.killTweensOf(this.shell);
		handBack(this.shell, this.panel);
		for (const [el, opacity] of this.concealed) el.style.opacity = opacity;
		this.concealed.clear();
		for (let i = this.undo.length - 1; i >= 0; i -= 1) this.undo[i]!();
		this.undo.length = 0;
		this.layer.remove();
	}

	private timeline(paused = true): gsap.core.Timeline {
		const tl = gsap.timeline({ paused });
		this.timelines.push(tl);
		return tl;
	}

	/**
	 * The destination's `fill`: its border draws on while opaque bricks switch off under a white
	 * front. Everything is built once, in one group that follows the region if it moves (a late
	 * banner above it, a scroll) for as long as the beat runs.
	 */
	private fillIn(tl: gsap.core.Timeline, fill: HTMLElement, fg: string): void {
		const box = boxOf(fill, VIEWPORT);
		const frame = frameStyleOf(fill);
		const border = parseFloat(frame.borderWidth) || 0;
		const inner = { x: box.x + border, y: box.y + border, w: box.w - 2 * border, h: box.h - 2 * border };
		const visible = intersect(inner, viewportBox());
		const group = document.createElementNS(SVG_NS, 'g');
		this.svg.appendChild(group);
		tl.eventCallback('onUpdate', () => {
			const now = boxOf(fill, VIEWPORT);
			group.setAttribute('transform', `translate(${now.x - box.x} ${now.y - box.y})`);
		});
		if (visible) {
			// Past the brick budget, bricks grow instead of multiplying: a 4K map stays a few hundred nodes.
			const size = Math.max(T.brickSize, Math.ceil(Math.sqrt((visible.w * visible.h) / T.maxBricks)));
			const bricks = document.createElementNS(SVG_NS, 'g');
			// Hard-edged: no anti-aliased seams between neighbours and no soft edge on a front.
			bricks.setAttribute('shape-rendering', 'crispEdges');
			group.appendChild(bricks);
			const area = { x: visible.x, y: visible.y, width: visible.w, height: visible.h, size };
			const cover = brickGrid(bricks, { ...area, inset: -0.5, fill: backingOf(fill) });
			const front = brickGrid(bricks, { ...area, inset: 1, fill: fg });
			dissolve(tl, cover, T.bricksAt, { span: T.bricksSpan });
			wave(tl, front, T.bricksAt, { span: T.bricksSpan, peak: T.frontPeak, settle: 0, flash: T.frontFlash, decay: T.frontDecay });
		}
		const outline = this.outlineOf(fill, frameStyleOf(fill), group);
		if (outline) {
			const restore = this.setStyle(fill, 'border-color', 'transparent');
			prepDraw(outline);
			draw(tl, outline, T.fillOutlineAt, { duration: T.fillOutline, ease: MOTION_EASES.out, stagger: 0 });
			// Once drawn, the region's own border takes over, while the brick front is still moving.
			tl.call(() => {
				restore();
				outline.remove();
			}, [], T.fillOutlineAt + T.fillOutline);
		}
	}

	/**
	 * An SVG stroke over `el`'s CSS border, or null when it has none or is off screen. It is
	 * snapped the way the browser paints a border — edges on device pixels, a width of whole
	 * device pixels and never under one — so the two swap without a visible step.
	 */
	private outlineOf(el: HTMLElement, frame: FrameStyle = frameStyleOf(el), parent: SVGElement = this.svg): SVGRectElement | null {
		const css = parseFloat(frame.borderWidth) || 0;
		if (!css || frame.borderStyle === 'none') return null;
		const box = boxOf(el, VIEWPORT);
		if (!intersect(box, viewportBox())) return null;
		const dpr = window.devicePixelRatio || 1;
		const snap = (v: number) => Math.round(v * dpr) / dpr;
		const width = Math.max(1, Math.floor(css * dpr + 1e-3)) / dpr;
		const x0 = snap(box.x), y0 = snap(box.y), x1 = snap(box.x + box.w), y1 = snap(box.y + box.h);
		const rect = document.createElementNS(SVG_NS, 'rect');
		rect.setAttribute('x', String(x0 + width / 2));
		rect.setAttribute('y', String(y0 + width / 2));
		rect.setAttribute('width', String(Math.max(0, x1 - x0 - width)));
		rect.setAttribute('height', String(Math.max(0, y1 - y0 - width)));
		rect.setAttribute('fill', 'none');
		rect.setAttribute('stroke', frame.borderColor);
		rect.setAttribute('stroke-width', String(width));
		rect.setAttribute('shape-rendering', 'crispEdges');
		parent.appendChild(rect);
		return rect;
	}

	/** Hide everything under `root` that is not a part or on the way to one. */
	private concealAllBut(root: HTMLElement, parts: HTMLElement[]): void {
		const path = new Set<Element>();
		for (const part of parts) {
			for (let node: Element | null = part; node && node !== root.parentElement; node = node.parentElement) path.add(node);
		}
		for (const el of [...this.concealed.keys()]) {
			if (path.has(el)) this.reveal(el);
		}
		const guarded = new Set<Element>();
		for (const node of path) {
			if (parts.includes(node as HTMLElement)) continue;
			guarded.add(node);
			for (const child of Array.from(node.children)) {
				if (!path.has(child) && child instanceof HTMLElement) this.conceal(child);
			}
		}
		this.path = path;
		this.guarded = guarded;
	}

	private conceal(el: HTMLElement): void {
		if (!this.concealed.has(el)) this.concealed.set(el, el.style.opacity);
		el.style.opacity = '0';
	}

	private reveal(el: HTMLElement): void {
		el.style.opacity = this.concealed.get(el) ?? '';
		this.concealed.delete(el);
	}

	/** Set an inline style until teardown. Returns a function that restores it early. */
	private setStyle(el: HTMLElement, property: string, value: string): () => void {
		const prior = el.style.getPropertyValue(property);
		el.style.setProperty(property, value);
		const restore = () => el.style.setProperty(property, prior);
		this.undo.push(restore);
		return restore;
	}

	private setAttribute(el: HTMLElement, name: string, value: string): void {
		const prior = el.getAttribute(name);
		el.setAttribute(name, value);
		this.undo.push(() => {
			if (prior === null) el.removeAttribute(name);
			else el.setAttribute(name, prior);
		});
	}

	/** Remember inline values a tween will overwrite, and clear GSAP's cache of them on undo. */
	private trackStyles(els: HTMLElement[], properties: string[]): void {
		const prior = els.map(el => properties.map(property => el.style.getPropertyValue(property)));
		this.undo.push(() => {
			gsap.set(els, { clearProps: properties.join(',') });
			els.forEach((el, i) => properties.forEach((property, j) => {
				if (prior[i]![j]) el.style.setProperty(property, prior[i]![j]!);
			}));
		});
	}
}
