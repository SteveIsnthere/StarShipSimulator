import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Container, DOMAdapter, type Filter, RendererType } from 'pixi.js';
import { createPostPass } from '$view/post';

// Programs are authored without a browser/GPU. These tests prove object state
// and inheritance policy, not rendering or performance acceptance.
beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({
  getContext: () => null,
} as unknown as HTMLCanvasElement));
afterAll(() => vi.restoreAllMocks());

const root = { resolution: 2, antialias: true, backendType: RendererType.WEBGL };
const nose = { x: 0.5, y: 0.5 };

describe('on-demand actual post state', () => {
  it('distinguishes attachment from enabled and preserves live inheritance settings', () => {
    const plume = new Container(), vehicle = new Container();
    const post = createPostPass(plume, vehicle, 390, 844);
    const idle = post.metadata(root);
    expect(idle.map(f => [f.id, f.attached, f.enabled, f.inputResolution])).toEqual([
      ['bloom', false, true, null], ['heat', false, true, null],
    ]);
    post.update(1, 1, nose, 0);
    const active = post.metadata(root);
    expect(active[0]).toEqual({ id: 'bloom', attached: true, enabled: true, compatible: true,
      resolution: 'inherit', antialias: 'inherit', inputResolution: 2, inputAntialias: true });
    // Heat currently owns a numeric resolution and independent AA policy.
    expect(active[1]!.resolution).toBe(1);
    expect(active[1]!.inputResolution).toBe(1);
    expect(active[1]!.antialias).toBe('off');
    expect(active[1]!.inputAntialias).toBe(false);
    expect(post.metadata({ ...root, resolution: 1, antialias: false })[0]).toMatchObject({
      inputResolution: 1, inputAntialias: false,
    });
    const bloom = plume.filters![0] as Filter;
    bloom.enabled = false;
    expect(post.metadata(root)[0]).toMatchObject({ attached: true, enabled: false,
      inputResolution: null, inputAntialias: null });
    bloom.enabled = true;
    plume.filters = [];
    expect(post.metadata(root)[0]).toMatchObject({ attached: false, enabled: true, inputResolution: null });
    // Prior snapshots are immutable captures, not aliases to cached frame state.
    expect(active[0]!.attached).toBe(true);
    expect(idle[0]!.attached).toBe(false);
    post.destroy();
    plume.destroy(); vehicle.destroy();
  });

  it('reads changed filter policy and reports incompatible or detached passes without execution claims', () => {
    const plume = new Container(), vehicle = new Container();
    const post = createPostPass(plume, vehicle, 1280, 720);
    post.update(1, 0, nose, 0);
    const bloom = plume.filters![0] as Filter;
    bloom.resolution = 0.5;
    bloom.antialias = 'off';
    expect(post.metadata(root)[0]).toMatchObject({ resolution: 0.5, antialias: 'off',
      inputResolution: 0.5, inputAntialias: false });
    expect(post.metadata({ ...root, backendType: RendererType.WEBGPU })[0]).toMatchObject({
      attached: true, enabled: true, compatible: false, inputResolution: null, inputAntialias: null,
    });
    post.update(0, 0, nose, 0);
    expect(post.metadata(root).every(f => !f.attached && f.inputResolution === null)).toBe(true);
    expect(post.active).toBe(false);
    post.destroy();
    expect(plume.filters).toEqual([]);
    expect(vehicle.filters).toEqual([]);
    plume.destroy(); vehicle.destroy();
  });
});
