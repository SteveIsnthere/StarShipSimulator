/** A control law consumes the returned mechanics before real actuators slew.
 * Forecasts supply their planned law instead of recursively running guidance. */
import type { SimState } from '../state';
import type { VehicleDefinition } from '../vehicle';
export type MechanicalControl=(state:SimState,dt:number,model:VehicleDefinition)=>void;
export type MechanicalAdvance=(previous:SimState,dt:number,control:MechanicalControl,model:VehicleDefinition)=>SimState;

import * as act from './actuation';
import { checkIfBreakUp, type StepDynamics } from '../physics/step-dynamics';
import { secureTowerCatch } from '../physics/tower-catch';
import type { StepInput } from '../step';
import { advanceFlightDamage } from '../physics/damage-flight';
import { invalidateBoosterReturn } from './booster-return-plan';

/** Existing controls, actuator, failure and clock completion shared by each
 * free vehicle and by both attached bodies. An attached hull cannot be caught. */
export function finishMechanicalStep(previous: SimState, s: SimState, dt: number, input: StepInput, model: VehicleDefinition, control: MechanicalControl, work: StepDynamics, catchEnabled = true): SimState {
  // Heat and ownership are endpoint updates, after paid impulse and before
  // guidance may consume the resulting capability or request new ignition.
  if (s.damage && !s.damage.terminal.active) {
    const revision = s.damage.revision;
    advanceFlightDamage(s, dt, model, 'hull');
    if (s.damage.revision !== revision && model.id === 'super-heavy') invalidateBoosterReturn(s.autopilot);
  }
  if (s.damage?.terminal.active) {
    checkIfBreakUp(s, model, work);
    s.world.environmentTime += dt;
    return s;
  }
  // --- 4. controlsUpdate ---------------------------------------------------
  // highLevelInput(): autopilot first, then manual input, which overrides it.
  // That is 2021's order — readInputFromManualFlightControl() ran after
  // autoPilotControlInput() and simply clobbered whatever the autopilot wrote,
  // which is why any manual touch instantly takes over.
  control(s, dt, model);

  if (input.throttle !== undefined) s.vehicle.throttle = input.throttle;
  if (input.pitchControl !== undefined) {
    s.autopilot.pitchControl = input.pitchControl;
    if (model.gridFins) s.autopilot.boosterFinControl = input.pitchControl;
  }

  act.controlTranslation(s, s.autopilot.pitchControl, dt, model, input.pitchControl !== undefined);
  act.throttleUpdate(s, dt);

  // Judge current pressure, tile temperature and specific force. Shutdown is
  // last, cancelling even an ignition just requested by controls. Motion
  // retains this step's paid impulse; no engine can fire on the next step.
  checkIfBreakUp(s, model, work);
  if (catchEnabled && model.id === 'super-heavy') secureTowerCatch(previous, s, model);

  // --- bookkeeping ---------------------------------------------------------
  s.world.environmentTime += dt;
  if (
    !s.failures.crashed &&
    !s.failures.inFlightBreakUp &&
    !s.status.onTheGround &&
    !s.status.landed
  ) {
    s.world.timeSpent += dt;
  }

  return s;
}
