// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Container, DOMAdapter, RendererType, Texture } from 'pixi.js';
import * as particles from '$view/particles';
import { createSession } from '$ui/session/session';
import * as componentVehicles from '$view/component-vehicle';
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
  request.enabled = false;
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

const request = vi.hoisted(() => ({ enabled: false }));
// Control only the sanctioned request seam; debug installation and every
// presentation method remain the real implementation, never an API mock.
vi.mock('$app/debug-request', async importOriginal => ({ ...await importOriginal<typeof import('$app/debug-request')>(), wantsSimDebug: () => request.enabled }));
it('keeps no-debug startup resources full and remounts an installed synchronous debug surface', async () => {
  installMemoryStorage();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList));
  vi.stubGlobal('ResizeObserver', undefined);
  setWindowViewport(390, 844);
  expect([window.innerWidth, window.innerHeight]).toEqual([390, 844]);
  const callbacks = new Map<number, FrameRequestCallback>(); let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { callbacks.set(++sequence, cb); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  const frame = () => { const item = callbacks.entries().next().value!; callbacks.delete(item[0]); item[1](performance.now() + 16); };
  const pools: particles.ParticleSystem[] = [], originalPool = particles.createParticleSystem;
  vi.spyOn(particles, 'createParticleSystem').mockImplementation((...args) => { const pool = originalPool(...args); pools.push(pool); return pool; });
  const bodies: componentVehicles.ComponentVehicle[] = [], originalBody = componentVehicles.createComponentVehicle;
  vi.spyOn(componentVehicles, 'createComponentVehicle').mockImplementation((...args) => { const body = originalBody(...args); bodies.push(body); return body; });
  const destroys: ReturnType<typeof vi.fn>[] = [];
  const prepareView = () => {
    const layers = { sky: new Container(), far: new Container(), world: new Container(), effectsBehind: new Container(), vehicle: new Container(), effectsFront: new Container() };
    const viewport = { ...computeViewport(390, 844, 52) };
    const renderer = { type: RendererType.CANVAS, view: { texture: { source: { resolution: 2, antialias: true } } }, screen: { width: 390, height: 844 }, canvas: { width: 780, height: 1688 } };
    const destroy = vi.fn(() => Object.values(layers).forEach(layer => layer.destroy({ children: true }))); destroys.push(destroy);
    mountedView = { get viewport() { return viewport; },
      set viewport(next: Viewport) {
        viewport.width = next.width; viewport.height = next.height;
        viewport.physicalHeight = next.physicalHeight; viewport.physicalWidth = next.physicalWidth; viewport.scale = next.scale;
      }, camera: createCamera(viewport, 0, 0, 0), layers, app: { renderer }, followAltitude() {}, setModeZoom() {}, zoom() {}, destroy,
      resize(w: number, h: number) { writeViewport(viewport, w, h, 52); renderer.screen = { width: w, height: h }; renderer.canvas = { width: w * 2, height: h * 2 }; } } as unknown as ViewApp;
    const fittedProbe = computeViewport(390, 844, 100);
    mountedView.viewport = fittedProbe;
    expect(mountedView.viewport).toBe(viewport); expect(mountedView.viewport).toEqual(fittedProbe);
    mountedView.viewport = computeViewport(390, 844, 52);
    expect(mountedView.viewport).toBe(viewport);
    return viewport;
  };
  delete (window as unknown as { __simDebug?: SimDebug }).__simDebug;
  request.enabled = false; const plainViewport = prepareView();
  const plain = createSession(); plain.store.setState({ hintSeen: true }); plain.togglePause();
  let teardown = await plain.mount(document.createElement('canvas'));
  try {
    frame(); expect('__simDebug' in window).toBe(false);
    expect(mountedView.viewport).toBe(plainViewport);
    expect(pools.map(pool => pool.capacity)).toEqual([4000, 4000]);
    expect(bodies).toHaveLength(3);
    expect(new Set(bodies.map(body => body.container)).size).toBe(3);
    const mainBodies = bodies.filter(body => body.container.parent === mountedView.layers.vehicle);
    expect(mainBodies).toHaveLength(2);
    expect(mainBodies.map(body => body.container.label)).toEqual(['starship', 'super-heavy']);
    expect(mainBodies.every(body => body.debrisContainer.parent === mountedView.layers.vehicle)).toBe(true);
    const insetBodies = bodies.filter(body => body.container.parent !== mountedView.layers.vehicle);
    expect(insetBodies).toHaveLength(1);
    const insetBody = insetBodies[0]!, mainShip = mainBodies[0]!;
    expect(insetBody.container.label).toBe('starship');
    expect(insetBody.container).not.toBe(mainShip.container);
    expect(insetBody.container.parent!.label).toBe('onboard-scene');
    expect(insetBody.container.parent!.parent!.label).toBe('onboard-inset');
    expect(insetBody.container.parent!.parent!.parent).toBe(mountedView.layers.effectsFront);
    expect([...insetBody.partsById.keys()]).toEqual([...mainShip.partsById.keys()]);
    for (const [id, part] of insetBody.partsById) {
      expect(part.container).not.toBe(mainShip.partsById.get(id)!.container);
      expect(part.materials[0]).not.toBe(mainShip.partsById.get(id)!.materials[0]);
    }
    for (const body of bodies) {
      expect(body.partsById.size).toBeGreaterThan(0);
      for (const [id, part] of body.partsById) {
        expect(part.component.id).toBe(id);
        expect(id.startsWith(body.container.label === 'starship' ? 'ship-' : 'booster-')).toBe(true);
        expect(part.materials.length).toBeGreaterThan(0);
      }
    }
    expect(bodies.flatMap(body => [...body.partsById.values()].flatMap(part => part.materials)).every(material => material.uniforms.uDetail === 1)).toBe(true);
    const state = JSON.stringify(plain.loop.state), owned = pools.slice();
    frame(); expect(JSON.stringify(plain.loop.state)).toBe(state);
    plain.restart(); frame();
    expect(pools).toEqual(owned); expect(plain.loop.totalSteps).toBe(0);
    const restarted = JSON.stringify(plain.loop.state); frame(); expect(JSON.stringify(plain.loop.state)).toBe(restarted);
  } finally { teardown(); }
  expect(callbacks.size).toBe(0); expect(destroys[0]).toHaveBeenCalledTimes(1);
  request.enabled = true; const diagnosticViewport = prepareView();
  const diagnostic = createSession(); diagnostic.store.setState({ hintSeen: true });
  teardown = await diagnostic.mount(document.createElement('canvas'));
  const debug = (window as unknown as { __simDebug: SimDebug }).__simDebug;
  try {
    debug.pause(); frame(); const snapshot = debug.presentation();
    expect(mountedView.viewport).toBe(diagnosticViewport);
    expect(snapshot).not.toBeInstanceOf(Promise); expect(snapshot).not.toHaveProperty('witnessSource');
    expect(snapshot.quality!.requested.mode).toBe('full'); expect(snapshot.quality!.actualBodies.map(body => body.particleCapacity)).toEqual([4000,4000]);
    const pristine = JSON.stringify(snapshot), physicsBefore = JSON.stringify(diagnostic.loop.state);
    expect(Object.isFrozen(snapshot.quality!.requested)).toBe(true);
    expect(Reflect.set(snapshot.quality!.requested, 'mode', 'reduced')).toBe(false);
    expect(Reflect.set(snapshot.renderer!.screen!, 'width', -99)).toBe(true);
    expect(Reflect.set(snapshot.components![0]!.meshIds, '0', -99)).toBe(true);
    expect(Reflect.set(snapshot.quality!.actualBodies[0]!.materials[0]!, 'detail', -99)).toBe(true);
    expect(Reflect.set(snapshot.components!, 'length', 0)).toBe(true);
    expect(JSON.stringify(debug.presentation())).toBe(pristine);
    expect(JSON.stringify(diagnostic.loop.state)).toBe(physicsBefore);
    debug.setRenderQuality('reduced'); frame(); expect(debug.presentation().quality!.requested.mode).toBe('reduced');
    const before = JSON.stringify(diagnostic.loop.state);
    expect(() => debug.setRenderQuality('invalid' as 'full')).toThrow(RangeError);
    expect(debug.presentation().quality!.requested.mode).toBe('reduced'); expect(JSON.stringify(diagnostic.loop.state)).toBe(before);
  } finally { teardown(); }
  expect(() => debug.presentation()).toThrow('presentation is not mounted');
  request.enabled = false; const remountViewport = prepareView(); teardown = await diagnostic.mount(document.createElement('canvas'));
  try {
    frame(); expect((window as unknown as { __simDebug: SimDebug }).__simDebug).toBe(debug);
    expect(mountedView.viewport).toBe(remountViewport); expect(remountViewport).not.toBe(diagnosticViewport);
    expect(debug.presentation()).not.toBeInstanceOf(Promise);
    expect(debug.presentation().quality!.requested.mode).toBe('full');
    expect(pools).toHaveLength(6); expect(pools.every(pool => pool.capacity === 4000)).toBe(true);
    diagnostic.restart(); frame(); expect(pools).toHaveLength(6);
  } finally { teardown(); request.enabled = false; }
  expect(callbacks.size).toBe(0); expect(destroys.every(destroy => destroy.mock.calls.length === 1)).toBe(true);
  expect(() => debug.presentation()).toThrow('presentation is not mounted');
  expect(() => debug.setRenderQuality('full')).toThrow('presentation is not mounted');
});
