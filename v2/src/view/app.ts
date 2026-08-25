/**
 * The PixiJS v8 application shell.
 *
 * Everything about the renderer that is not "what to draw": creating the
 * canvas, sizing it, reacting to the window, and holding the scene graph.
 *
 * Layer order is fixed here rather than left to insertion order, so a later
 * task cannot accidentally draw the ship behind the sky.
 */
import { Application, Container } from 'pixi.js';
import { computeViewport, createCamera, type CameraState, type Viewport } from './camera';

/** The 2021 sky colour, and the anchor for the whole palette. */
export const SKY_COLOR = 0xa7bdd9;

/** Named layers, back to front. */
export interface Layers {
  /** Sky gradient and stars. Never scrolls with the camera. */
  readonly sky: Container;
  /** Distant parallax: clouds, far terrain. */
  readonly far: Container;
  /** The ground, StarBase, trees, the pig. */
  readonly world: Container;
  /** Particle effects behind the vehicle (engine plumes). */
  readonly effectsBehind: Container;
  /** The vehicle. */
  readonly vehicle: Container;
  /** Particle effects in front (re-entry shimmer, debris). */
  readonly effectsFront: Container;
}

export interface ViewApp {
  readonly app: Application;
  readonly layers: Layers;
  readonly camera: CameraState;
  viewport: Viewport;
  /** Recompute the viewport and resize the renderer. */
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface ViewOptions {
  /** Where to mount. */
  readonly canvas: HTMLCanvasElement;
  /** m — used to scale the world so the ship is a sensible size on screen. */
  readonly vehicleHeight: number;
  /** m — initial camera position. */
  readonly downRangeDistance: number;
  readonly speedX?: number;
  readonly speedY?: number;
  readonly width?: number;
  readonly height?: number;
  /** Passed through to Pixi; tests use 'webgl' since WebGPU is unavailable headless. */
  readonly preference?: 'webgl' | 'webgpu';
}

/**
 * Create the renderer.
 *
 * Async because Pixi v8's `init` is: it negotiates WebGPU and falls back to
 * WebGL, and neither is available synchronously.
 */
export async function createView(options: ViewOptions): Promise<ViewApp> {
  // Sized from the window rather than from the element. A canvas with no width
  // attribute reports its intrinsic 300x150 until CSS layout has settled, so
  // reading clientWidth here renders the first frames at the wrong size and
  // then snaps - a visible flash on load, and one an e2e test caught.
  const width = options.width ?? globalThis.innerWidth ?? 800;
  const height = options.height ?? globalThis.innerHeight ?? 600;

  const app = new Application();
  await app.init({
    canvas: options.canvas,
    width,
    height,
    background: SKY_COLOR,
    antialias: true,
    // Match device pixels so text and thin geometry stay crisp, but cap the
    // ratio: a 3x phone display costs 9x the fill rate for no visible gain.
    resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
    autoDensity: true,
    ...(options.preference ? { preference: options.preference } : {}),
  });

  const layers: Layers = {
    sky: new Container({ label: 'sky' }),
    far: new Container({ label: 'far' }),
    world: new Container({ label: 'world' }),
    effectsBehind: new Container({ label: 'effectsBehind' }),
    vehicle: new Container({ label: 'vehicle' }),
    effectsFront: new Container({ label: 'effectsFront' }),
  };
  // Back to front. Explicit, so draw order is a property of this file rather
  // than of whatever order later tasks happen to add sprites in.
  app.stage.addChild(
    layers.sky,
    layers.far,
    layers.world,
    layers.effectsBehind,
    layers.vehicle,
    layers.effectsFront,
  );

  let viewport = computeViewport(width, height, options.vehicleHeight);
  const camera = createCamera(
    viewport,
    options.downRangeDistance,
    options.speedX ?? 0,
    options.speedY ?? 0,
  );

  const view: ViewApp = {
    app,
    layers,
    camera,
    get viewport() {
      return viewport;
    },
    set viewport(next: Viewport) {
      viewport = next;
    },
    resize(nextWidth: number, nextHeight: number) {
      app.renderer.resize(nextWidth, nextHeight);
      viewport = computeViewport(nextWidth, nextHeight, options.vehicleHeight);
    },
    destroy() {
      app.destroy(true, { children: true, texture: true });
    },
  };

  return view;
}
