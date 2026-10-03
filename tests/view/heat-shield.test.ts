import { describe, expect, it } from 'vitest';
import { applyHeatShieldGain, writeHeatShieldAlbedo } from '$view/heat-shield';

function fixture() {
  const width = 36, height = 200;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const normals = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    pixels.set([180, 180, 180, 255], i);
    normals.set(x < width / 2 ? [255, 128, 128, 128] : [128, 128, 255, 128], i);
  }
  return { width, height, pixels, normals, out: new Uint8Array(pixels.length) };
}

describe('startup-owned belly material', () => {
  it('keeps stainless at the silhouette rim and puts restrained dark tiles on the viewer-facing belly', () => {
    const f = fixture();
    const original = f.pixels.slice();
    writeHeatShieldAlbedo(f.pixels, f.normals, f.width, f.height, f.out);
    expect(f.out[0]).toBe(180);
    const belly = (100 * f.width + 28) * 4;
    expect(f.out[belly]).toBeLessThan(180 * 0.5);
    expect(f.out[belly]).toBeGreaterThan(0);
    expect(f.pixels).toEqual(original);
    const tones = new Set<number>();
    for (let y = 0; y < f.height; y++) tones.add(f.out[(y * f.width + 28) * 4]!);
    expect(tones.size).toBeGreaterThan(1);
    expect(tones.size).toBeLessThan(5);
  });

  it('authors a neutral tile base instead of retaining photographed belly illumination', () => {
    const bright = fixture(), dark = fixture();
    for (let i = 0; i < dark.pixels.length; i += 4) dark.pixels.set([30, 30, 30, 255], i);
    writeHeatShieldAlbedo(bright.pixels, bright.normals, bright.width, bright.height, bright.out);
    writeHeatShieldAlbedo(dark.pixels, dark.normals, dark.width, dark.height, dark.out);
    const belly = (99 * bright.width + 28) * 4;
    expect([...bright.out.slice(belly, belly + 4)]).toEqual([...dark.out.slice(belly, belly + 4)]);
    // The steel rim retains original art, so the projection remains distinct.
    expect(bright.out[0]).not.toBe(dark.out[0]);
  });

  it('removes legacy gain from neutral tiles while keeping steel gain and normals intact', () => {
    const f = fixture();
    for (let i = 3; i < f.normals.length; i += 4) f.normals[i] = ((i - 3) / 4) % 2 ? 230 : 80;
    const before = f.normals.slice();
    applyHeatShieldGain(f.pixels, f.normals);
    expect(f.normals[3]).toBe(before[3]);
    const belly = (99 * f.width + 28) * 4;
    expect(f.normals[belly + 3]).toBe(128);
    for (let i = 0; i < f.normals.length; i += 4) {
      expect([...f.normals.slice(i, i + 3)]).toEqual([...before.slice(i, i + 3)]);
    }
  });

  it('retains alpha coverage and premultiplied color, including transparent and soft edge texels', () => {
    const f = fixture();
    f.pixels.set([180, 100, 80, 64], 0);
    f.pixels.set([180, 100, 80, 0], 4);
    writeHeatShieldAlbedo(f.pixels, f.normals, f.width, f.height, f.out);
    expect(f.out[3]).toBe(64);
    expect(f.out[0]).toBeLessThanOrEqual(64);
    expect([...f.out.slice(4, 8)]).toEqual([0, 0, 0, 0]);
    for (let i = 0; i < f.out.length; i += 4) {
      expect(f.out[i + 3]).toBe(f.pixels[i + 3]);
      for (let c = 0; c < 3; c++) expect(f.out[i + c]).toBeLessThanOrEqual(f.out[i + 3]!);
    }
  });

  it('can omit tile seams at reduced detail without turning the belly back into stainless', () => {
    const f = fixture();
    writeHeatShieldAlbedo(f.pixels, f.normals, f.width, f.height, f.out, false);
    const tones = new Set<number>();
    for (let y = 0; y < f.height; y++) tones.add(f.out[(y * f.width + 28) * 4]!);
    expect(tones.size).toBe(1);
    expect([...tones][0]).toBeLessThan(90);
  });
});
