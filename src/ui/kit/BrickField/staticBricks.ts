import { brickLayout, LOADING_BUILD, paintBricks, type BrickBuild } from './brickMotion';

/** Size a 2D canvas to its CSS box at `dpr` and paint one frame of `build` at `seconds`. */
export function paintStaticBricks(canvas: HTMLCanvasElement, width: number, height: number, dpr: number, build: BrickBuild, seconds: number, color: string): void {
	const pixelWidth = Math.max(1, Math.round(width * dpr));
	const pixelHeight = Math.max(1, Math.round(height * dpr));
	if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
	if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
	const painter = canvas.getContext('2d');
	if (!painter) return;
	const scale = pixelWidth / Math.max(width, 1);
	painter.setTransform(scale, 0, 0, pixelHeight / Math.max(height, 1), 0, 0);
	paintBricks(painter, brickLayout(width, height), build, seconds, scale, color);
}

/**
 * The static HTML loading screen's field. `index.html` inlines this (see
 * scripts/lib/loadingStandIn.mjs), so the first frame is the brick grid before any module
 * has loaded. It paints the build's first moment — the moment the live field starts from,
 * so the hand-off to React shows no jump — repaints when the window resizes, and lets go
 * of the canvas, and its backing store, once React replaces the stand-in.
 */
export function mountStaticBricks(canvas: HTMLCanvasElement | null): void {
	if (!canvas) return;
	const release = () => {
		observer.disconnect();
		detached.disconnect();
		canvas.width = 0;
		canvas.height = 0;
	};
	// React replacing the stand-in is a DOM mutation; a removed element need not report a resize.
	const detached = new MutationObserver(() => { if (!canvas.isConnected) release(); });
	detached.observe(document.documentElement, { childList: true, subtree: true });
	const observer = new ResizeObserver(() => {
		if (!canvas.isConnected) {
			release();
			return;
		}
		const rect = canvas.getBoundingClientRect();
		paintStaticBricks(canvas, rect.width, rect.height, Math.min(2, devicePixelRatio || 1), LOADING_BUILD, 0, getComputedStyle(canvas).color);
	});
	observer.observe(canvas);
}
