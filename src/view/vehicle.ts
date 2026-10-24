/** V3 Ship adapter. Original component geometry replaces the photographed hull;
 * the same immutable parts serve the main view, inset and physical fragments. */
import type { Container } from 'pixi.js';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import type { DamageState } from '$core/damage-state';
import { damageModelFor } from '$core/physics/damage-model';
import { finActuationMaxAngle } from '$core/constants';
import { createVehicleGeometry } from './vehicle-geometry';
import { createComponentVehicle, type ComponentVehicle } from './component-vehicle';
import type { CameraState, Viewport } from './camera';
import type { SunLight } from './sun';

export const FIN_COLOR = 0xb9bec4;
export const SHIP_VISUAL_DIAMETER = SHIP.diameter * (1 + 2 * .46);
export interface VehiclePose {
  readonly altitude: number;
  readonly downRangeDistance: number;
  /** rad, clockwise from vertical. */
  readonly pitch: number;
  /** % physical control-group articulation. */
  readonly frontFinExtension: number;
  readonly aftFinExtension: number;
  /** K; finite component temperatures override this once damage is connected. */
  readonly surfaceTemperature?: number;
  readonly damage?: DamageState | null;
}

/** Startup join by physical identity: partition order is not draw order.
 * Physical centroid coordinates remain the frozen core surrogate even when
 * the projected panel articulates. Never infer mass from a polygon's centre. */
export function createVehicleDamageBinding(model: VehicleDefinition, renderer: ComponentVehicle) {
  const bindings = damageModelFor(model).partition.components.map((physical, index) => {
    const part = renderer.partsById.get(physical.id);
    if (!part) throw new Error(`Missing original vehicle component: ${physical.id}`);
    return { physical, index, part };
  });
  const detached = { altitude: 0, downRangeDistance: 0, pitch: 0, pivotToCentroidX: 0, pivotToCentroidY: 0 };
  return (damage: DamageState, surfaceTemperature: number) => {
    for (const { physical, index, part } of bindings) {
      const condition = damage.components[index]!, debris = damage.debris[index]!;
      if (!debris.active) renderer.setDetachedPose(physical.id, null);
      if (physical.kind === 'flap') {
        const span = .04 + .96 * Math.sin(Math.max(0, Math.min(finActuationMaxAngle, condition.loadedAngle))) / Math.sin(finActuationMaxAngle);
        renderer.setArticulation(physical.id, 0, span);
      } else if (physical.kind === 'grid-fin') {
        renderer.setArticulation(physical.id, condition.loadedAngle);
      }
      renderer.setComponentState(physical.id, condition.attached && !damage.terminal.active, surfaceTemperature);
      // The finite hull node represents residual steel, not exterior TPS.
      // Root nodes heat tiny subparts; omit their visual glow until a bounded
      // root patch exists instead of lighting the entire flap from that node.
      if (physical.kind === 'hull') {
        for (let i = 0; i < part.materials.length; i++)
          if (part.component.polygons[i]!.material === 'steel') part.materials[i]!.setTemperature(damage.hull.temperature);
      }
      if (!debris.active) continue;
      const dx = physical.x - part.component.x, dy = part.component.station - physical.station;
      detached.altitude = debris.altitude; detached.downRangeDistance = debris.x;
      // Radial grid articulation is retained inside the existing mesh buffers;
      // its hinge does not rotate in the drawing plane or alter body orientation.
      detached.pitch = debris.pitch;
      detached.pivotToCentroidX = dx;
      detached.pivotToCentroidY = dy;
      renderer.setDetachedPose(physical.id, detached);
    }
  };
}
export interface VehicleView {
  readonly container: Container;
  readonly components: ComponentVehicle;
  update(camera: CameraState, viewport: Viewport, state: VehiclePose, sun?: SunLight): void;
  destroy(): void;
}

/** Original geometry and analytic materials; no external hull art is sampled. */
export function createVehicle(): VehicleView {
  const geometry = createVehicleGeometry({id: 'ship', height: SHIP.height, diameter: SHIP.diameter,
    frontFinStation: SHIP.frontFinStation, aftFinStation: SHIP.aftFinStation, engines: SHIP.engines});
  const components = createComponentVehicle(geometry);
  const writeDamage = createVehicleDamageBinding(SHIP, components);
  return {
    container: components.container, components,
    update(camera, viewport, state, sun) {
      components.updatePose(camera, viewport, state, sun);
      if (state.damage) {
        writeDamage(state.damage, state.surfaceTemperature ?? 293.15);
        return;
      }
      for (const component of geometry.components) {
        const part = components.partsById.get(component.id)!;
        components.setComponentState(component.id, part.container.visible, state.surfaceTemperature ?? 293.15);
        if (component.kind !== 'flap') continue;
        const extension = component.id.includes('-front-') ? state.frontFinExtension : state.aftFinExtension;
        // Project the folded panel to an edge, without resizing the root chord.
        const span = .04 + .96 * Math.max(0, Math.min(100, extension)) / 100;
        components.setArticulation(component.id, 0, span);
      }
    },
    destroy() { components.destroy(); },
  };
}
