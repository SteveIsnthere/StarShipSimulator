import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.restoreAllMocks());

async function imageHarness(fail?: (src: string) => 'load' | 'decode' | undefined) {
  const { DOMAdapter, Texture, TextureSource } = await import('pixi.js');
  const loads: string[] = [], decoded = new Set<object>();
  vi.spyOn(DOMAdapter.get(), 'createImage').mockImplementation(() => {
    const image = {
      crossOrigin: '', onload: null as (() => void) | null, onerror: null as (() => void) | null,
      decode: vi.fn(async () => {
        if (fail?.(source) === 'decode') throw new Error('decode failed');
        decoded.add(image);
      }),
    };
    let source = '';
    Object.defineProperty(image, 'src', { get: () => source, set: (src: string) => {
      expect(image.crossOrigin).toBe('anonymous');
      source = src; loads.push(src);
      queueMicrotask(() => fail?.(src) === 'load' ? image.onerror?.() : image.onload?.());
    } });
    return image as unknown as HTMLImageElement;
  });
  const from = vi.spyOn(Texture, 'from').mockImplementation(resource => {
    expect(decoded.has(resource as object), 'GPU texture creation follows successful decode').toBe(true);
    return new Texture({ source: new TextureSource({ width: 2, height: 2 }) });
  });
  return { loads, from };
}

it('loads every unique scenery source once across concurrent and later scene creation', async () => {
  const { loads, from } = await imageHarness();
  const { loadTextures, GROUND_OBJECTS } = await import('$view/assets');
  const sources = [...new Set(GROUND_OBJECTS.map(o => o.src))];
  const [a, b] = await Promise.all([loadTextures(), loadTextures()]);
  const c = await loadTextures();
  expect(loads.sort()).toEqual(sources.sort());
  expect(from).toHaveBeenCalledTimes(sources.length);
  expect(a.size).toBe(sources.length); expect(b).not.toBe(a);
  for (const src of sources) { expect(b.get(src)).toBe(a.get(src)); expect(c.get(src)).toBe(a.get(src)); }
});

it.each(['load', 'decode'] as const)('propagates %s failure and allows the same asset to retry', async kind => {
  let failed = true;
  const { loads } = await imageHarness(src => failed && src.includes('pig.webp') ? kind : undefined);
  const { loadTextures } = await import('$view/assets');
  await expect(loadTextures()).rejects.toThrow();
  failed = false;
  const map = await loadTextures();
  expect(map.get('assets/pig.webp')).toBeDefined();
  expect(loads.filter(src => src === 'assets/pig.webp')).toHaveLength(2);
});

it('evicts a destroyed shared texture and reloads only that asset for the next scene', async () => {
  const { loads } = await imageHarness();
  const { loadTextures } = await import('$view/assets');
  const a = await loadTextures(), old = a.get('assets/pig.webp')!;
  const count = loads.length;
  old.destroy(true);
  const b = await loadTextures();
  expect(b.get('assets/pig.webp')).not.toBe(old);
  expect(loads.slice(count)).toEqual(['assets/pig.webp']);
  for (const [src, texture] of a) if (src !== 'assets/pig.webp') expect(b.get(src)).toBe(texture);
});
