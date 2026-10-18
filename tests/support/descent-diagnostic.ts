/** Opt-in explanatory traces. Ordinary matrix runs neither import nor profile. */
import { Session } from 'node:inspector/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATCH, SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { starBaseXPos } from '$core/constants';
import type { MissionObservedState, MissionObserver, ScenarioMission } from './scenario-mission';

/** Preserve nonfinite/undefined/signed-zero evidence instead of JSON null. */
export function diagnosticJSON(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v === undefined) return { $diagnostic: 'undefined' };
    if (typeof v === 'function') return { $diagnostic: 'opaque-function', name: v.name };
    if (typeof v === 'number' && (!Number.isFinite(v) || Object.is(v, -0))) {
      return { $diagnostic: 'number', value: Object.is(v, -0) ? '-0' : String(v) };
    }
    return v;
  }, 2) + '\n';
}
const detachedCopy = (value: unknown): unknown => JSON.parse(diagnosticJSON(value));

function lug(state: MissionObservedState) {
  const k = state.kinematics, arm = CATCH.lugStation - SUPER_HEAVY.height / 2;
  return { x: k.downRangeDistance + arm * Math.sin(k.pitch),
    altitude: k.altitude + arm * Math.cos(k.pitch),
    speedX: k.speedX + arm * Math.cos(k.pitch) * k.angularVelocity,
    speedY: k.speedY - arm * Math.sin(k.pitch) * k.angularVelocity };
}

/** Independent scalar observation of the canonical catch clauses, no helper
 * interception or physics call. Terminal COM data is never a hull/lug pose. */
export function diagnosticCatchCrossing(previous: MissionObservedState, current: MissionObservedState) {
  const before = lug(previous), after = lug(current);
  if (!(before.altitude > CATCH.planeAltitude && after.altitude <= CATCH.planeAltitude)) return;
  const t = (before.altitude - CATCH.planeAltitude) / (before.altitude - after.altitude);
  const p = previous.kinematics, k = current.kinematics;
  const pitch = p.pitch + Math.atan2(Math.sin(k.pitch - p.pitch), Math.cos(k.pitch - p.pitch)) * t;
  const x = p.downRangeDistance + (k.downRangeDistance - p.downRangeDistance) * t
    + (CATCH.lugStation - SUPER_HEAVY.height / 2) * Math.sin(pitch);
  const vx = before.speedX + (after.speedX - before.speedX) * t;
  const vy = before.speedY + (after.speedY - before.speedY) * t;
  const groundHeight = SUPER_HEAVY.height * Math.abs(Math.cos(k.pitch)) / 2
    + SUPER_HEAVY.diameter * Math.abs(Math.sin(k.pitch)) / 2;
  const clauses = { notAlreadyLanded: !current.status.landed,
    noCrash: !current.failures.crashed, noBreakup: !current.failures.inFlightBreakUp,
    noFuelFailure: !current.failures.fuelRunOut, aboveGround: k.altitude > groundHeight,
    finite: [x, pitch, vx, vy].every(Number.isFinite),
    lateral: Math.abs(x - starBaseXPos) <= CATCH.halfWidth,
    lateralSpeed: Math.abs(vx) <= CATCH.maxLateralSpeed,
    downSpeed: vy < 0 && vy >= -CATCH.maxDownSpeed, pitch: Math.abs(pitch) <= CATCH.maxPitch };
  const assessment = current.status.landed ? 'already-secured/post-contact'
    : current.damage?.terminal.active && (current.failures.crashed || current.failures.inFlightBreakUp)
      ? 'terminal-reset' : 'unmodified-candidate';
  return { before, after, fraction: t, x, vx, vy, pitch, clauses, assessment,
    eligible: assessment === 'unmodified-candidate' ? Object.values(clauses).every(Boolean) : undefined,
    // Separate matrix requirement, not an extra canonical contact clause.
    remainingFuelPositive: current.vehicle.propellantMass > 0 };
}

function sample(state: MissionObservedState, tick: number, reason: string) {
  const a = state.autopilot, v = state.vehicle, f = state.forces;
  const job = a.boosterPrediction, plan = a.boosterReturnPlan;
  return { tick, reason, time: state.world.environmentTime, kinematics: { ...state.kinematics },
    lug: lug(state), vehicle: { propellant: v.propellantMass, mass: v.vehicleMass,
      inertia: v.vehicleMomentOfInertia, throttle: v.throttle, actualThrottle: v.throttleCurrent,
      gimbal: v.gimbalPosition, gimbalDirection: v.gimbalPointingDirection,
      frontFin: v.frontFinExtension, aftFin: v.aftFinExtension, rcs: v.rcsRunTimeRemaining },
    engines: { running: [...state.engines.running], failed: [...state.engines.failed],
      pending: [...state.engines.ignitionCountdown] },
    control: { phase: a.boosterPhase, centreOnly: a.boosterEntryCentreOnly,
      rangeError: a.boosterRangeError, fallTime: a.boosterFallTime, coastPitch: a.boosterCoastPitch,
      finControl: a.boosterFinControl, pitchControl: a.pitchControl, rcsCommand: a.rcsThrustCommand,
      arrivalTime: a.boosterArrivalTime, terminalMissed: a.boosterTerminalMissed,
      terminalIgnitionTime: a.boosterTerminalIgnitionTime },
    forces: { thrust: f.thrust, paidAX: f.paidThrustAccelerationX, paidAY: f.paidThrustAccelerationY,
      thrustVector: f.thrustVectorAcceleration, finTorque: f.frontFinDragAngularAcceleration,
      rcsTorque: f.rcsThrustAngularAcceleration, angularDrag: f.angularDragAcceleration,
      offAxisTorque: f.offAxisThrustDifferenceAcceleration, temperature: f.surfaceTemperature,
      q: f.dynamicPressure, g: f.perceivedG },
    planner: job ? { stage: job.stage, duration: job.duration, iterations: job.iterations,
      attemptedTicks: [...job.attemptedTicks], done: job.done,
      hintForceIterations: job.hintForceIterations, hintForceSlices: job.hintForceSlices,
      rollout: { done: job.rollout.done, burnRemaining: job.rollout.burnRemaining,
        burnTicks: job.rollout.burnTicks, shutdownAt: job.rollout.shutdownAt,
        result: { ...job.rollout.result, handoff: job.rollout.result.handoff ? { ...job.rollout.result.handoff } : undefined } },
      published: job.published ? { originTime: job.published.originTime,
        forecast: detachedCopy(job.published.forecast), decision: detachedCopy(job.published.decision) } : undefined } : undefined,
    plan: plan ? { ...plan, handoff: { ...plan.handoff } } : undefined,
    damage: state.damage ? { revision: state.damage.revision, eventCount: state.damage.eventCount,
      hull: { ...state.damage.hull }, terminal: { ...state.damage.terminal },
      components: state.damage.components.map(c => ({ componentIndex: c.componentIndex,
        attached: c.attached, permanentFailure: c.permanentFailure, loadedAngle: c.loadedAngle,
        root: { ...c.root }, tps: c.tps.map(n => ({ ...n })) })) } : undefined,
    status: { ...state.status }, warnings: { ...state.warnings }, failures: { ...state.failures },
    rng: { seed: state.rng.seed, counters: { ...state.rng.counters } } };
}

function changed(previous: MissionObservedState, current: MissionObservedState): boolean {
  const p = previous.autopilot, a = current.autopilot;
  if (p.boosterPhase !== a.boosterPhase || p.boosterTerminalMissed !== a.boosterTerminalMissed
    || p.boosterTerminalIgnitionTime !== a.boosterTerminalIgnitionTime
    || previous.damage?.revision !== current.damage?.revision
    || previous.damage?.hull.valid !== current.damage?.hull.valid
    || (previous.vehicle.propellantMass > 0) !== (current.vehicle.propellantMass > 0)
    || previous.status.landed !== current.status.landed) return true;
  for (const key of Object.keys(current.failures) as (keyof typeof current.failures)[]) {
    if (previous.failures[key] !== current.failures[key]) return true;
  }
  for (let i = 0; i < current.engines.running.length; i++) {
    if (previous.engines.running[i] !== current.engines.running[i]
      || previous.engines.failed[i] !== current.engines.failed[i]
      || (previous.engines.ignitionCountdown[i] === null) !== (current.engines.ignitionCountdown[i] === null)) return true;
  }
  for (let i = 0; i < (current.damage?.components.length ?? 0); i++) {
    const p = previous.damage?.components[i], c = current.damage!.components[i]!;
    if (p?.root.valid !== c.root.valid || p.attached !== c.attached
      || p.permanentFailure !== c.permanentFailure
      || p.tps[0]!.valid !== c.tps[0]!.valid || p.tps[1]!.valid !== c.tps[1]!.valid) return true;
  }
  return false;
}

export async function startDescentDiagnostic(name: string, directory: string) {
  if (!/^super-heavy\/(before-flip|reentry): autopilot lands or catches$/.test(name)) {
    throw new Error('Descent diagnosis permits only the two predeclared booster rows');
  }
  mkdirSync(directory, { recursive: true });
  const path = join(directory, name.startsWith('super-heavy/before-flip') ? 'before-flip' : 'reentry');
  for (const suffix of ['.trace.json', '.cpuprofile']) {
    if (existsSync(path + suffix)) throw new Error('Refusing to replace a consumed diagnostic receipt');
  }
  writeFileSync(path + '.started.json', diagnosticJSON({ name, pid: process.pid, node: process.version,
    snapshotPolicy: 'Numeric/state data preserved with tagged opaque operation leaves; function identity is not serialized.' }), { flag: 'wx' });
  const session = new Session();
  session.connect();
  try { await session.post('Profiler.enable'); await session.post('Profiler.start'); }
  catch (error) { session.disconnect(); throw error; }
  const samples: unknown[] = [], crossings: unknown[] = [];
  let initial: unknown, terminal: unknown, result: unknown, nearest: unknown;
  let lastPrevious: MissionObservedState | undefined;
  let nearestDistance = Infinity, lastTick = 0;
  const observe: MissionObserver = (previous, current, tick) => {
    lastTick = tick;
    lastPrevious = previous;
    if (tick === 1) { initial = detachedCopy(previous); samples.push(sample(previous, 0, 'initial')); }
    const pose = lug(current), distance = Math.hypot(pose.x - starBaseXPos, pose.altitude - CATCH.planeAltitude);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { tick, time: current.world.environmentTime, distance, lug: pose,
        kinematics: { ...current.kinematics }, phase: current.autopilot.boosterPhase };
    }
    const crossing = diagnosticCatchCrossing(previous, current);
    if (crossing) crossings.push({ tick, crossing,
      previous: sample(previous, tick - 1, 'crossing-before'), current: sample(current, tick, 'crossing-after') });
    const done = current.status.landed || current.failures.crashed || current.failures.inFlightBreakUp;
    const event = changed(previous, current);
    if (done || event || tick % 120 === 0 || (current.kinematics.altitude < 500 && tick % 30 === 0)) {
      samples.push(sample(current, tick, done ? 'terminal' : event ? 'event' : 'cadence'));
    }
    if (done) terminal = { previous: detachedCopy(previous), current: detachedCopy(current) };
  };
  function flush() {
    writeFileSync(path + '.trace.json', diagnosticJSON({ name, lastTick, initial, terminal,
      result, nearest, samples, crossings,
      interpretation: 'Terminal damage snapshot is physical COM before crash resets, not a hull/lug pose. Sampling profile includes observation/assertion overhead.' }));
  }
  return { observe,
    recordResult(mission: ScenarioMission) {
      result = { outcome: mission.outcome, ticks: mission.ticks, seconds: mission.seconds,
        finite: mission.finite, peakTemperature: mission.peakTemperature,
        peakPressure: mission.peakPressure, peakG: mission.peakG, events: mission.events };
      if (!terminal) terminal = { previous: detachedCopy(lastPrevious), current: detachedCopy(mission.state) };
      flush(); // Synchronous evidence survives an expired case timer at the next await.
    },
    async finish() {
      try {
        flush();
        const { profile } = await session.post('Profiler.stop');
        writeFileSync(path + '.cpuprofile', JSON.stringify(profile));
      } finally { session.disconnect(); }
    } };
}
