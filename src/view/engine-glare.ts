/** Authored light, not photometry. Physical firing and ground distance are
 * its only authority; no staging timer or retained light after shutdown. */
import { Container, Sprite, type Texture } from 'pixi.js';
import type { SimState } from '$core/state';
import { SHIP, type VehicleDefinition } from '$core/vehicle';

export function createEngineGlare(texture: Texture, model: VehicleDefinition = SHIP) {
  const container = new Container({ label: 'engine-glare' });
  const lights = model.engines.map(() => {
    const light = new Sprite(texture);
    light.anchor.set(0.5);
    light.blendMode = 'add';
    light.tint = 0xffbe78;
    light.visible = false;
    container.addChild(light);
    return light;
  });
  const ground = new Sprite(texture);
  ground.label = 'engine-ground-wash';
  ground.anchor.set(0.5);
  ground.blendMode = 'add';
  ground.tint = 0xffb36a;
  ground.visible = false;
  container.addChild(ground);
  return {
    container,
    update(state: SimState, scale: number, nozzleX: number, nozzleY: number,
      groundY: number, nozzleAltitude: number) {
      const pitch = state.kinematics.pitch;
      const throttle = state.vehicle.throttleCurrent;
      const power = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle / 100)) : 0;
      let firing = 0;
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i]!;
        light.visible = !!state.engines.running[i] && !state.engines.failed[i] && state.forces.thrust > 0;
        if (!light.visible) continue;
        firing++;
        const mount = model.engines[i]!;
        light.position.set(nozzleX + Math.cos(pitch) * mount.offAxis * scale,
          nozzleY + Math.sin(pitch) * mount.offAxis * scale);
        const diameter = (mount.kind === 'vacuum' ? 11 : 8) * scale;
        light.width = light.height = diameter;
        // Bound summed light even for 33 engines. Positive thrust retains a
        // small floor for supplied zero-throttle states, as the gas does.
        light.alpha = (0.08 + power * 0.12) / Math.sqrt(model.engines.length);
      }
      const upright = Math.max(0, Math.cos(pitch));
      const proximity = Number.isFinite(nozzleAltitude)
        ? Math.max(0, 1 - Math.max(0, nozzleAltitude) / 160) : 0;
      ground.visible = firing > 0 && proximity > 0 && upright > 0.8;
      if (ground.visible) {
        ground.position.set(nozzleX, groundY);
        ground.width = (18 + Math.max(0, nozzleAltitude) * 0.3) * scale;
        ground.height = 3 * scale;
        ground.alpha = (0.1 + power * 0.25) * proximity * upright
          * Math.min(1, firing / 3);
      }
    },
    reset() {
      for (const light of lights) light.visible = false;
      ground.visible = false;
    },
    destroy() { container.destroy({ children: true }); },
  };
}
