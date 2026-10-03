/** Interaction-only setup, retaining the actual selected mission body. */
import { fieldsToPreset, type EditorFields } from '$app/menu';
import { starBaseXPos } from '$core/constants';
import { toDeg } from '$core/units';
import type { ScenarioPreset } from '$core/scenarios';
import type { MissionController } from './mission-controller';

export function configuredFlight(fields: EditorFields, current: ScenarioPreset, controller: MissionController): ScenarioPreset {
  const state = controller.loop.state;
  const base = controller.mission ? { ...current, id: 'custom',
    basedOn: controller.model.id === 'super-heavy' ? 'booster-sep' : 'hot-stage',
    altitude: state.kinematics.altitude,
    xPosition: state.kinematics.downRangeDistance - starBaseXPos,
    speedX: state.kinematics.speedX, speedY: state.kinematics.speedY,
    pitch: toDeg(state.kinematics.pitch), propellant: state.vehicle.propellantMass / 1000,
    wind: state.world.wind,
  } : current;
  const preset = fieldsToPreset(fields, base);
  // A cleared presentation origin must not change the physical booster.
  return !fields.basedOn && controller.model.id === 'super-heavy'
    ? { ...preset, basedOn: base.basedOn ?? base.id } : preset;
}
