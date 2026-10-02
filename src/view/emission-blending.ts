import { RendererType, type Renderer, type WebGLRenderer, type WebGPURenderer } from 'pixi.js';

/**
 * Additive light contributes RGB, not occlusion alpha.
 *
 * Pixi 8.20's default add accumulates alpha too. A normal filter composite then
 * subtracts background light, even for a wholly additive plume. Preserve the
 * destination alpha so a mixed smoke/fire render texture carries smoke's
 * occlusion and fire's emission independently, in the original draw order.
 *
 * This renderer-local adapter uses public state methods; no protected blend
 * map or global Pixi configuration is changed. WebGL context restoration runs
 * through setBlendMode again. WebGPU descriptors are copied, never shared-map
 * mutated. Opaque-root RGB stays identical without filters. Emissive textures
 * must be composited before exporting: unpremultiplying zero-alpha RGB loses
 * emitted light. The application exports its opaque, already-composited canvas.
 */
export function installEmissionBlending(renderer: Renderer): () => void {
  if (renderer.type === RendererType.WEBGL) {
    const glRenderer = renderer as WebGLRenderer;
    const state = glRenderer.state;
    const original = state.setBlendMode;
    state.setBlendMode = function (mode) {
      const before = this.blendMode;
      original.call(this, mode);
      if (this.blendMode === 'add' && before !== 'add') {
        const gl = glRenderer.gl;
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      }
    };
    return () => {
      state.setBlendMode('normal');
      state.setBlendMode = original;
    };
  }

  // Pixi may choose its Canvas fallback, which has no GPU state to adapt.
  if (renderer.type !== RendererType.WEBGPU) return () => {};

  const state = (renderer as WebGPURenderer).state;
  const original = state.getColorTargets;
  state.getColorTargets = function (settings, count, format) {
    const targets = original.call(this, settings, count, format);
    if (settings.blend && settings.blendMode === 'add') {
      for (const target of targets) {
        if (target.blend) target.blend = { ...target.blend,
          alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } };
      }
    }
    return targets;
  };
  return () => { state.getColorTargets = original; };
}
