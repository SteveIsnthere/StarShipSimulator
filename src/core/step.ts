/**
 * The simulation step. Ported from backend/updateBackEnd.js.
 *
 * `step(state, dt, input)` is pure: same state, same dt, same input, identical
 * output, always. It returns a NEW SimState and never touches the one it is
 * given. That is the property golden fixtures are built on, and the reason this
 * file may not read the clock, the DOM, or a global.
 *
 * ORDER IS THE CONTRACT. The phases run in a specific sequence and several read
 * values the previous phase just wrote. Reordering anything here is a physics
 * change, not a tidy-up. Phase 6b Task 5, Bug fix: ground support and
 * breakup now read current forces; collision still precedes fuel use:
 *   1. environmentUpDate      atmosphere from altitude
 *   2. vehicleStatusUpDate    collision, propellant, engine status
 *   3. FlightParamsUpDate     basic params, spatial motion, rotational motion
 *   4. controlsUpdate         autopilot, translation, throttle
 *
 * THE INTEGRATOR IS VELOCITY VERLET — M11.3, Fidelity. Up to M11.3 phase 3
 * integrated as 2021 did: position by the incoming velocity, velocity by the
 * acceleration stored at the end of the PREVIOUS step, then a fresh
 * acceleration for next time — a first-order scheme. Measured against
 * Kepler's closed form on an eccentric vacuum orbit (tests/core/verlet.test.ts)
 * its position error halved with dt and its energy error was 2e-6 at 1/120;
 * the M11 survey's "part in 10^10" was a circular orbit, which is a fixed
 * point of this polar scheme and hides the error. Velocity Verlet is second
 * order in both: the error quarters with dt and energy holds to 7e-13.
 * Within one step, for the translational motion:
 *
 *   forces   drag, lift, thrust from the INCOMING state (3a, as before)
 *   a_n      those, plus gravity and the polar terms at the incoming r and v
 *   x_{n+1}  = x_n + v_n dt + a_n dt^2 / 2
 *   a_{n+1}  the same aero and thrust accelerations, plus gravity at the NEW
 *            r and the polar terms at the new r with the Euler-predicted
 *            velocity v_n + a_n dt (a velocity-dependent force needs a
 *            velocity at the new time, and the predictor is second order)
 *   v_{n+1}  = v_n + (a_n + a_{n+1}) dt / 2
 *
 * The stored `accelerationX/Y` is a_{n+1}: the acceleration at the state the
 * step returns, which is what the HUD and the autopilot read. The aerodynamic
 * forces are NOT re-evaluated at the new velocity — they are held at v_n for
 * the whole step, so the scheme is second order in gravity and first in drag,
 * which is the order the goldens exercise it in: drag is dissipative and the
 * conservation argument is about vacuum. Rotational motion takes the same
 * form with the angular acceleration STORED from the previous step as
 * alpha_n (the torques are only known after the translational update, since
 * the fin forces read the new airspeed), the angular drag at the predicted
 * omega_n + alpha_n dt, and the stored `angularAcceleration` is alpha_{n+1}.
 *
 * On `dt`: 2021 divided per-second rates by `renderTimeInterval`, which equals
 * `frameRate / timeAccel` and so is the reciprocal of simulated seconds per
 * frame. `X / renderTimeInterval` is therefore exactly `X * dt`.
 */
import { SHIP, type VehicleDefinition } from './vehicle';
import { createStepDynamics, prepareDynamics, integrateTranslation, finishTranslation, integrateRotation } from './physics/step-dynamics';
import { runAutopilot } from './autopilot';
import { runBoosterPostStep } from './autopilot/booster';
import { finishMechanicalStep, type MechanicalControl } from './control/mechanical';
import { invalidateBoosterReturn } from './control/booster-return-plan';
import { cloneState, type SimState } from './state';

/**
 * Everything the outside world can tell the simulation in one step.
 *
 * In 2021 these were read straight from DOM sliders inside the physics loop
 * (updateBackEnd.js:197 and :201). Passing them in is what removes wall 2 from
 * the hot path and what makes a step replayable.
 */
export interface StepInput {
  /** % — commanded throttle, 0..100. Undefined leaves the current command. */
  throttle?: number | undefined;
  /** % — pitch command, -100..100. Undefined leaves the current command. */
  pitchControl?: number | undefined;
}

export const NO_INPUT: StepInput = {};

/** Standalone steps complete synchronously before prediction work resumes. */
const dynamics = createStepDynamics();

export function step(previous: SimState, dt: number, input: StepInput = NO_INPUT, model: VehicleDefinition = SHIP): SimState {
  const next=advance(previous,dt,input,model,flightControls);
  if(model.id==='super-heavy')runBoosterPostStep(next,dt,model,advanceMechanics);
  return next;
}

function flightControls(state:SimState,dt:number,model:VehicleDefinition):void {
  runAutopilot(state,dt,model,advanceMechanics);
}

/** The very same physics/engine/actuator advance, with a supplied planned
 * control law. Input and all RNG are cloned just as in normal step(). */
export function advanceMechanics(previous:SimState,dt:number,control:MechanicalControl,model:VehicleDefinition):SimState {
  return advance(previous,dt,NO_INPUT,model,control);
}

function advance(previous:SimState,dt:number,input:StepInput,model:VehicleDefinition,control:MechanicalControl):SimState {
  const s = cloneState(previous);
  // Chopstick contact carries weight and torque until a scenario restart.
  // A secured booster has no ground contact and cannot restart propulsion.
  if (model.id === 'super-heavy' && previous.status.landed) {
    s.engines.running.fill(false);
    s.engines.ignitionCountdown.fill(null);
    s.world.environmentTime += dt;
    s.world.updatedFrameCount += 1;
    return s;
  }

  // Invalidate before policy can execute a cutoff from the old commanded
  // future. Post-step planning may observe the complete overridden source.
  if(model.id==='super-heavy' && (input.pitchControl!==undefined || input.throttle!==undefined))
    invalidateBoosterReturn(s.autopilot);

  prepareDynamics(s, dt, model, dynamics);
  const held = integrateTranslation(s, dt, dynamics.bodyAccelerationX, dynamics.bodyAccelerationY, model);
  finishTranslation(s, dt, dynamics);
  integrateRotation(s, dt, model, dynamics, held);

  return finishMechanicalStep(previous, s, dt, input, model, control, dynamics);
}
