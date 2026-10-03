import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DOMAdapter } from 'pixi.js';
import { createSheath } from '$view/reentry';

describe('independent skin and plasma controls', () => {
  // This is a real scene-graph/uniform test, not shader execution. Only
  // Pixi's browser precision probe needs a headless boundary; GPU pixels
  // are verified separately in the browser.
  beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({
    getContext: () => null,
  } as unknown as HTMLCanvasElement));
  afterAll(() => vi.restoreAllMocks());
  it('keeps hot skin visible with no atmospheric plasma and removes both when cold', () => {
    const sheath = createSheath();
    sheath.set(0, 1, 0, 0, 1);
    expect(sheath.mesh.visible).toBe(true);
    sheath.set(0, 1, 0, 0, 0);
    expect(sheath.mesh.visible).toBe(false);
    sheath.destroy();
  });

  it('changes skin glow at equal flux while preserving windward direction and paused time', () => {
    const sheath = createSheath();
    expect(sheath.mesh.shader).not.toBeNull();
    const uniforms = (sheath.mesh.shader!.resources['sheathUniforms'] as {
      uniforms: { uStrength: number; uSurfaceGlow: number; uWind: Float32Array; uTime: number };
    }).uniforms;
    sheath.set(0.4, 1, 0, 12, 0);
    expect(uniforms.uStrength).toBe(0.4);
    expect(uniforms.uSurfaceGlow).toBe(0);
    sheath.set(0.4, -1, 0, 12, 1);
    expect(uniforms.uStrength).toBe(0.4);
    expect(uniforms.uSurfaceGlow).toBe(1);
    expect(uniforms.uWind[0]).toBe(-1);
    expect(uniforms.uTime).toBe(12);
    const wind = uniforms.uWind;
    sheath.set(0.4, -1, 0, 12, 1);
    expect(uniforms.uWind).toBe(wind);
    expect(uniforms.uTime).toBe(12);
    sheath.destroy();
  });
});
