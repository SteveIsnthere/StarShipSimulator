/** Optional pure formatting of actual startup-owned vehicle objects. */
import type { SceneVehiclesRuntime } from './scene-vehicles-runtime';
export function attachSceneVehiclesWitness(runtime: SceneVehiclesRuntime) {
  const source = runtime.witnessSource;
  const { ship, booster, shipParticles, boosterParticles, shipBell, boosterBell,
    legacyShipEffects, missionShipEffects, boosterEffects } = source;
  const witness = {
    presentation() {
      const effects = source.selectedBooster ? boosterEffects : source.missionActive ? missionShipEffects : legacyShipEffects;
      const bell = source.selectedBooster ? boosterBell : shipBell;
      const particles = source.selectedBooster ? boosterParticles : shipParticles;
      return { nozzleX: effects.nozzle.x, nozzleY: effects.nozzle.y,
        bell: { visibleMounts: bell.container.visible ? bell.container.children.filter(child => child.visible).length : 0 },
        particles: particles.inspect(),
        components: [ship, booster].flatMap(body => [...body.components.partsById.values()].map(part => {
          const detached = part.container.parent !== body.container;
          const ownerVisible = detached ? body.components.debrisContainer.visible : body.container.visible;
          const point = part.container.toGlobal({ x: 0, y: 0 });
          const bounds = part.container.getBounds();
          return { id: part.component.id, vehicle: body.container.label, detached,
            visible: ownerVisible && part.container.visible && part.container.renderable && !!part.container.parent?.visible,
            meshes: part.container.children.filter(child => child.visible).length, meshIds: part.meshes.map(mesh => mesh.uid), x: point.x, y: point.y,
            left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height };
        })),
        bodies: [ship.container, booster.container].filter(body => body.visible).map(body => ({
          id: body.label, x: body.x, y: body.y, rotation: body.rotation,
          width: body.width, height: body.height,
        })),
      };
    },
    qualityMetadata() {
      return [ship, booster].map((body, index) => {
        const particles = index ? boosterParticles : shipParticles;
        return { id: index ? 'super-heavy' : 'ship', particleCapacity: particles.capacity, particleAlive: particles.alive,
        materials: [...body.components.partsById.values()].flatMap(part => part.materials.map((material, index) => ({
          componentId: part.component.id, materialIndex: index, detail: material.uniforms.uDetail, glow: material.uniforms.uGlow,
        }))),
      }; });
    },
  };
  // Preserve the original public own-key order and synchronous methods.
  return {
    draw: runtime.draw, presentation: witness.presentation,
    setHullDetail: runtime.setHullDetail, qualityMetadata: witness.qualityMetadata,
    setVehiclesVisible: runtime.setVehiclesVisible,
    setComponentVisible: runtime.setComponentVisible,
    setParticlesVisible: runtime.setParticlesVisible,
    reset: runtime.reset, destroy: runtime.destroy,
  };
}
