// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Container, DOMAdapter, RendererType, Texture } from 'pixi.js';
import * as particles from '$view/particles';
import { createSession } from '$ui/session/session';
import { installMemoryStorage } from '../memory-storage';
import type { SimDebug } from '$app/debug';
import { computeViewport, createCamera, writeViewport } from '$view/camera';
import type { Viewport } from '$view/camera';
import type { ViewApp } from '$view/app';
// These tests exercise real scene orchestration, vehicle/material/pool/post objects.
// Asset/world factories require a renderer; their isolated stubs are not optical evidence.
vi.mock('$view/assets', () => ({ loadTextures: vi.fn(async () => ({})) }));
vi.mock('$view/terrain', () => ({ createTerrainTextures: () => ({}) }));
vi.mock('$view/world', () => ({ createWorld: () => ({ container: new Container(), update() {} }) }));
vi.mock('$view/catch-tower', () => ({ createCatchTower: () => ({ container: new Container(), update() {} }) }));
vi.mock('$view/distant-earth', () => ({ createDistantEarth: () => ({ container: new Container(), update() {} }) }));
vi.mock('$view/clouds', () => ({ createCloudDeck: () => ({ container: new Container(), update() {} }) }));
vi.mock('$view/sky', async importOriginal => ({ ...await importOriginal<typeof import('$view/sky')>(), createSky: () => ({ container: new Container(), update() {}, resize() {} }) }));
vi.mock('$view/motion-cues', async importOriginal => ({ ...await importOriginal<typeof import('$view/motion-cues')>(), createFlightPathMarker: () => ({ container: new Container(), update() {} }) }));
const viewportKeys = ['innerWidth', 'innerHeight'] as const;
let windowViewportDescriptors: Record<typeof viewportKeys[number], PropertyDescriptor | undefined>;
function setWindowViewport(width: number, height: number) {
  for (const [key, value] of [['innerWidth', width], ['innerHeight', height]] as const) {
    Object.defineProperty(window, key, { configurable: true, enumerable: windowViewportDescriptors[key]?.enumerable ?? true, writable: true, value });
  }
}
beforeEach(() => {
  windowViewportDescriptors = { innerWidth: Object.getOwnPropertyDescriptor(window, 'innerWidth'), innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight') };
  vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({ getContext: () => null } as unknown as HTMLCanvasElement);
  vi.spyOn(particles, 'createParticleTextures').mockReturnValue({ core: Texture.EMPTY, soft: Texture.EMPTY, smoke: Texture.EMPTY, wisp: Texture.EMPTY });
});
afterEach(() => {
  try { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as unknown as { __simDebug?: SimDebug }).__simDebug; } finally {
    for (const key of viewportKeys) {
      const descriptor = windowViewportDescriptors[key];
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else Reflect.deleteProperty(window, key);
    }
  }
});

// Real session/debug/scene remain unmocked. Only the renderer creation boundary
// and external GPU asset/world factories above are isolated, never physics.
let mountedView: ViewApp;
vi.mock('$view/app', () => ({ createView: async () => mountedView }));
it('mount routes actual public quality API through paused session, resize, restart and teardown', async () => {
  installMemoryStorage();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList));
  vi.stubGlobal('ResizeObserver', undefined);
  setWindowViewport(390, 844);
  expect([window.innerWidth, window.innerHeight]).toEqual([390, 844]);
  const callbacks = new Map<number, FrameRequestCallback>(); let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { callbacks.set(++sequence, cb); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  const frame = () => { const item = callbacks.entries().next().value!; callbacks.delete(item[0]); item[1](performance.now() + 16); };
  const owned: particles.ParticleSystem[] = [], original = particles.createParticleSystem;
  vi.spyOn(particles, 'createParticleSystem').mockImplementation((...args) => { const pool = original(...args); owned.push(pool); return pool; });
  const layers = { sky: new Container(), far: new Container(), world: new Container(), effectsBehind: new Container(), vehicle: new Container(), effectsFront: new Container() };
  const viewport = { ...computeViewport(390, 844, 52) };
  const renderer = { type: RendererType.CANVAS, view: { texture: { source: { resolution: 2, antialias: true } } }, screen: { width: 390, height: 844 }, canvas: { width: 780, height: 1688 } };
  const destroy = vi.fn(() => Object.values(layers).forEach(layer => layer.destroy({ children: true })));
  const resize = vi.fn((w: number, h: number) => { writeViewport(viewport, w, h, 52); renderer.screen = { width: w, height: h }; renderer.canvas = { width: w * 2, height: h * 2 }; });
  mountedView = { get viewport() { return viewport; },
    set viewport(next: Viewport) {
      viewport.width = next.width; viewport.height = next.height;
      viewport.physicalHeight = next.physicalHeight; viewport.physicalWidth = next.physicalWidth; viewport.scale = next.scale;
    }, camera: createCamera(viewport, 0, 0, 0), layers, app: { renderer },
    followAltitude() {}, setModeZoom() {}, zoom() {}, destroy,
    resize } as unknown as ViewApp;
  const fittedProbe = computeViewport(390, 844, 100);
  mountedView.viewport = fittedProbe;
  expect(mountedView.viewport).toBe(viewport); expect(mountedView.viewport).toEqual(fittedProbe);
  mountedView.viewport = computeViewport(390, 844, 52);
  expect(mountedView.viewport).toBe(viewport);
  const session = createSession(); session.store.setState({ hintSeen: true }); session.startHotStage(123);
  // Explicit thermal precondition isolates render policy, not physical heating.
  for (const state of [session.mission!.ship, session.mission!.booster]) { state.forces.thermalPower = 1e9; state.forces.surfaceTemperature = 1300; state.damage!.hull.temperature = 1300; }
  const teardown = await session.mount(document.createElement('canvas'));
  const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  try {
    expect(resize).toHaveBeenLastCalledWith(390, 844);
    expect(mountedView.viewport).toBe(viewport);
    debug.pause(); frame(); expect(debug.paused).toBe(true);
    expect(mountedView.viewport).toBe(viewport);
    // Meaningful baseline RED: fail explicitly at the missing mounted public API.
    expect(typeof debug.setRenderQuality).toBe('function');
    expect(debug.presentation().quality!.requested.mode).toBe('full');
    expect(debug.presentation().quality!.actualBodies.every(body => body.materials.some(row => row.glow > 0))).toBe(true);
    expect(owned.map(pool => pool.capacity)).toEqual([4000, 4000]);
    const containers = owned.map(pool => pool.container), meshes = debug.presentation().components!.map(row => row.meshIds);
    const physical = JSON.stringify(session.mission), steps = session.loop.totalSteps;
    for (const mode of ['reduced', 'full', 'reduced'] as const) {
      debug.setRenderQuality(mode); frame(); const actual = debug.presentation();
      expect(actual.quality!.requested.mode).toBe(mode);
      expect(actual.quality!.actualBodies.flatMap(body => body.materials).every(row => row.detail === (row.componentId.startsWith('booster-grid-') ? 1 : Number(mode === 'full')))).toBe(true);
      expect(actual.components!.map(row => row.meshIds)).toEqual(meshes);
      expect(actual.renderer!.resolution).toBe(2); expect(actual.renderer!.antialias).toBe(true);
      expect(actual.renderer!.filters![1]!.attached).toBe(mode === 'full');
      expect(JSON.stringify(session.mission)).toBe(physical); expect(session.loop.totalSteps).toBe(steps);
    }
    expect(() => debug.setRenderQuality('auto' as 'full')).toThrow(RangeError);
    for (const pool of owned) { pool.burst('explosion', 0, 0, 5000, 1); expect(pool.alive).toBe(4000); }
    const saturated = owned.map(pool => pool.inspect()); debug.setRenderQuality('full'); debug.setRenderQuality('reduced');
    expect(owned.map(pool => pool.inspect())).toEqual(saturated);
    setWindowViewport(844, 390);
    expect([window.innerWidth, window.innerHeight]).toEqual([844, 390]);
    window.dispatchEvent(new Event('resize')); frame();
    expect(resize).toHaveBeenLastCalledWith(844, 390);
    expect(mountedView.viewport).toBe(viewport);
    expect([viewport.width, viewport.height]).toEqual([844, 390]);
    expect(debug.presentation()).toMatchObject({ width: 844, height: 390, quality: { requested: { mode: 'reduced' } } });
    session.restart(); frame(); expect(session.mission!.phase).toBe('attached');
    expect(owned.map(pool => pool.alive)).toEqual([0, 0]); expect(owned).toHaveLength(2);
    expect(owned.map(pool => pool.container)).toEqual(containers);
    expect(debug.presentation().quality!.requested.mode).toBe('reduced');
  } finally { teardown(); }
  expect(callbacks.size).toBe(0); expect(destroy).toHaveBeenCalledTimes(1);
  expect(() => debug.presentation()).toThrow('presentation is not mounted');
  expect(() => debug.setRenderQuality('full')).toThrow('presentation is not mounted');
});
