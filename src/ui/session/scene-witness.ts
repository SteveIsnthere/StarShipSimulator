/** Optional full formatter; reads actual owned objects only on request. */
import type { WebGLRenderer } from 'pixi.js';
import type { Scene } from './scene';
import type { SceneRuntime } from './scene-runtime';
import { attachSceneVehiclesWitness } from './scene-vehicles-witness';
export function attachSceneWitness(runtime: SceneRuntime): Scene {
  const witnessSource = runtime.witnessSource;
  const { view, post, RendererType } = witnessSource;
  const vehicles = attachSceneVehiclesWitness(witnessSource.vehicles);
  const witness = {
    presentation(): ReturnType<Scene['presentation']> {
      const renderer = view.app.renderer;
      const source = renderer.view.texture.source;
      const gl = renderer.type === RendererType.WEBGL ? (renderer as WebGLRenderer).gl : undefined;
      return { ...vehicles.presentation(), width: view.viewport.width,
        height: view.viewport.height, worldDt: witnessSource.lastWorldDt,
        quality: { requested: witnessSource.quality, actualBodies: vehicles.qualityMetadata() },
        renderer: {
          backend: renderer.type === RendererType.WEBGL ? 'webgl'
            : renderer.type === RendererType.WEBGPU ? 'webgpu'
              : renderer.type === RendererType.CANVAS ? 'canvas' : 'unknown',
          backendType: renderer.type, resolution: source.resolution,
          screen: { width: renderer.screen.width, height: renderer.screen.height },
          backing: { width: renderer.canvas.width, height: renderer.canvas.height },
          antialias: source.antialias,
          webgl: gl ? { drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight,
            antialias: gl.getContextAttributes()?.antialias ?? null, contextLost: gl.isContextLost() } : null,
          filters: post.metadata({ resolution: source.resolution, antialias: source.antialias, backendType: renderer.type }),
        } };
    },
  };
  // Original public keys/order/descriptors; no private read source is returned.
  return {
    draw: runtime.draw, setRenderQuality: runtime.setRenderQuality,
    resize: runtime.resize, presentation: witness.presentation,
    setComponentVisible: runtime.setComponentVisible,
    setVehiclesVisible: runtime.setVehiclesVisible,
    setParticlesVisible: runtime.setParticlesVisible,
    resetFlight: runtime.resetFlight, destroy: runtime.destroy,
  };
}
