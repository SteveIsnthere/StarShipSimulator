/** V3 Super Heavy: three projected lattice fins and retained open hot stage. */
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createVehicleGeometry } from './vehicle-geometry';
import { createComponentVehicle } from './component-vehicle';
import { createVehicleDamageBinding, type VehicleView } from './vehicle';

export function createBoosterVehicle(): VehicleView {
  const geometry = createVehicleGeometry({id: 'super-heavy',height: SUPER_HEAVY.height,
    diameter: SUPER_HEAVY.diameter,gridFinStation: SUPER_HEAVY.gridFins!.station, engines: SUPER_HEAVY.engines});
  const components = createComponentVehicle(geometry);
  const writeDamage = createVehicleDamageBinding(SUPER_HEAVY, components);
  return {
    container: components.container, components,
    update(camera, viewport, state, sun) {
      components.updatePose(camera, viewport, state, sun);
      if (state.damage) {
        writeDamage(state.damage, state.surfaceTemperature ?? 293.15);
        return;
      }
      const angle = Math.max(-1, Math.min(1, (state.frontFinExtension - 50) / 50)) * SUPER_HEAVY.gridFins!.maxAngle;
      for (const component of geometry.components) {
        const part = components.partsById.get(component.id)!;
        components.setComponentState(component.id, part.container.visible, state.surfaceTemperature ?? 293.15);
        if (component.kind === 'grid-fin') components.setArticulation(component.id, angle);
      }
    },
    destroy() { components.destroy(); },
  };
}
