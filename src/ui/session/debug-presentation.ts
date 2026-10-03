/** On-demand renderer witnesses, behind the existing debug surface. */
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
    setVehiclesVisible: (visible: boolean) => live().setVehiclesVisible(visible),
    setParticlesVisible: (visible: boolean) => live().setParticlesVisible(visible),
  };
}
