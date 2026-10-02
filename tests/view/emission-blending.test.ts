import { describe, expect, it } from 'vitest';
import { GpuStateSystem, RendererType, State, type Renderer } from 'pixi.js';
import { installEmissionBlending } from '$view/emission-blending';

describe('WebGPU emission and occlusion descriptors', () => {
  it('leaves the Canvas fallback alone without accessing GPU state', () => {
    const renderer = Object.freeze({ type: RendererType.CANVAS }) as Renderer;
    const uninstall = installEmissionBlending(renderer);
    expect(() => uninstall()).not.toThrow();
    expect(Object.keys(renderer)).toEqual(['type']);
  });

  it('additive RGB accumulates while destination alpha is preserved', () => {
    const state = new GpuStateSystem();
    const renderer = { type: RendererType.WEBGPU, state } as Renderer;
    const settings = State.for2d();
    settings.blendMode = 'add';
    const original = state.getColorTargets;
    const baseline = original.call(state, settings, 1, 'rgba8unorm');
    const baselineCopy = structuredClone(baseline);
    const uninstall = installEmissionBlending(renderer);
    const target = state.getColorTargets(settings, 1, 'rgba8unorm')[0]!;
    expect(target.blend!.color).toEqual({ srcFactor: 'one', dstFactor: 'one', operation: 'add' });
    expect(target.blend!.alpha).toEqual({ srcFactor: 'zero', dstFactor: 'one', operation: 'add' });
    expect(baseline).toEqual(baselineCopy);
    uninstall();
    expect(state.getColorTargets).toBe(original);
    expect(state.getColorTargets(settings, 1, 'rgba8unorm')).toEqual(baselineCopy);
  });

  it('normal smoke and disabled blending keep their original descriptors', () => {
    const state = new GpuStateSystem();
    const renderer = { type: RendererType.WEBGPU, state } as Renderer;
    const settings = State.for2d();
    const normal = state.getColorTargets(settings, 2, 'rgba8unorm');
    const uninstall = installEmissionBlending(renderer);
    expect(state.getColorTargets(settings, 2, 'rgba8unorm')).toEqual(normal);
    settings.blend = false;
    expect(state.getColorTargets(settings, 1, 'rgba8unorm')[0]!.blend).toBeUndefined();
    uninstall();
  });
});
