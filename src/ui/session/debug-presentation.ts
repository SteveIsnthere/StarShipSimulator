/** On-demand renderer witnesses, behind the existing debug surface. */
import type { RenderQualityMode } from '$view/render-quality';
import type { Scene } from './scene';

export function createPresentationProbe() {
  let scene: Scene | undefined;
  const live = () => {
    if (!scene) throw new Error('presentation is not mounted');
    return scene;
  };
  return {
    bind(next: Scene) { scene = next; },
    unbind(previous: Scene) { if (scene === previous) scene = undefined; },
    presentation: () => live().presentation(),
    setRenderQuality: (mode: RenderQualityMode) => live().setRenderQuality(mode),
    setComponentVisible: (id: string, visible: boolean) => live().setComponentVisible(id, visible),
    setVehiclesVisible: (visible: boolean) => live().setVehiclesVisible(visible),
    setParticlesVisible: (visible: boolean) => live().setParticlesVisible(visible),
  };
}
