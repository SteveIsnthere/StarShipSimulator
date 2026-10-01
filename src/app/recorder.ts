/**
 * The black box: the flight recorder behind the plots.
 *
 * It lives in app/, not core/, and that is a deliberate boundary. The history
 * is unbounded — a long flight is tens of thousands of samples — and SimState is
 * cloned on every step. Growing arrays inside it would make each step O(n) in
 * the length of the flight and would put the whole recording into every golden
 * fixture. So the recorder watches the simulation from outside instead: it is
 * handed each state and copies out the numbers it wants.
 *
 * The sampling rule is 2021's, from updateBackEnd.js:212 — every
 * `recordTimeInterval` frames, and not while the flight is over or the vehicle
 * is sitting on the ground. It is keyed off `world.updatedFrameCount`, which is
 * part of SimState, so the same flight records the same samples regardless of
 * frame rate or how the steps were batched.
 */
import * as C from '$core/constants';
import type { SimState } from '$core/state';
import { DT } from './loop';

/** One recorded channel. */
export interface Channel {
  readonly id: string;
  readonly label: string;
  read(state: SimState): number;
}

/**
 * Every channel 2021 recorded, in its original grouping.
 *
 * Units are converted here rather than at plot time, which is where 2021 did it
 * (`listOfpropellentRemainingCopy.map(x => x / 1000)` built a second array every
 * time the plot view opened).
 */
export const CHANNELS: readonly Channel[] = [
  // motionAnglePlot
  { id: 'pitch', label: 'Pitch', read: (s) => s.kinematics.pitch as number },
  { id: 'angleOfMotion', label: 'Angle of motion', read: (s) => s.kinematics.angleOfMotion as number },
  { id: 'angleOfAttack', label: 'Angle of attack', read: (s) => s.kinematics.angleOfAttack as number },
  {
    id: 'angleInToTheWind',
    label: 'Angle into the wind',
    read: (s) => s.kinematics.angleInToTheWind as number,
  },

  // motionSpeedPlot
  { id: 'speedX', label: 'Speed X', read: (s) => s.kinematics.speedX },
  { id: 'speedY', label: 'Speed Y', read: (s) => s.kinematics.speedY },
  { id: 'trueSpeed', label: 'Speed', read: (s) => s.kinematics.trueSpeed },

  // aerodynamicForcePlot
  { id: 'drag', label: 'Drag', read: (s) => s.forces.aerodynamicDrag },
  { id: 'lift', label: 'Lift', read: (s) => s.forces.aerodynamicLift },

  // altitudePlot and flyPathPlot
  { id: 'altitude', label: 'Altitude', read: (s) => s.kinematics.altitude },
  {
    id: 'downRange',
    label: 'Downrange',
    // Relative to StarBase, which is what the fly-path plot showed.
    read: (s) => s.kinematics.downRangeDistance - C.starBaseXPos,
  },

  // thermalPower & dynamicPressure
  { id: 'thermalPower', label: 'Heating', read: (s) => s.forces.thermalPower },
  { id: 'dynamicPressure', label: 'Dynamic pressure', read: (s) => s.forces.dynamicPressure },

  // accelerationPlot
  { id: 'g', label: 'G', read: (s) => s.forces.perceivedG },
  { id: 'gX', label: 'G X', read: (s) => s.forces.perceivedG_X },
  { id: 'gY', label: 'G Y', read: (s) => s.forces.perceivedG_Y },

  // controlInPutPlot
  { id: 'pitchControl', label: 'Yoke', read: (s) => s.autopilot.pitchControl },
  // The COMMANDED throttle, which is what plotting.js:288 drew. The actual
  // throttle chases it at throttleSpeed; plotting the command is what makes
  // this the "control input" plot rather than an engine telemetry plot.
  { id: 'throttle', label: 'Throttle', read: (s) => s.vehicle.throttle },

  // propellentRemainingPlot — tonnes, converted once here rather than per plot.
  { id: 'propellant', label: 'Propellant', read: (s) => s.vehicle.propellantMass / 1000 },
];

export interface Recorder {
  /** Offer a state; it is recorded only if the sampling rule says so. */
  sample(state: SimState): void;
  /** Seconds since the recording started, one per sample. */
  readonly time: readonly number[];
  /** Channel id -> samples. Same length as `time`. */
  readonly series: Readonly<Record<string, number[]>>;
  readonly length: number;
  clear(): void;
  /**
   * Replace these samples with another recorder's (M12.3).
   *
   * COPY, NOT SWAP, and the distinction is load-bearing. `clear()` truncates
   * the arrays in place because the trajectory map holds references to them
   * (M7.1) and would otherwise be left drawing the previous flight for ever.
   * Anything that wants to keep a flight has to keep the NUMBERS, and this is
   * the one place that knows which arrays those are.
   */
  copyFrom(other: Recorder): void;
}

/**
 * updateBackEnd.js:212 — when a sample is taken.
 *
 * Exported because it is the rule, not an implementation detail: a flight that
 * has ended stops recording, so the plots show the flight rather than a long
 * flat tail of the wreckage sitting on the ground.
 */
export function shouldSample(state: SimState): boolean {
  if (state.world.updatedFrameCount % C.recordTimeInterval !== 0) return false;
  return (
    !state.failures.crashed &&
    !state.failures.inFlightBreakUp &&
    !state.status.onTheGround &&
    !state.status.landed
  );
}

export function createRecorder(): Recorder {
  const time: number[] = [];
  const series: Record<string, number[]> = {};
  for (const channel of CHANNELS) series[channel.id] = [];

  let elapsed = 0;

  return {
    time,
    series,
    get length() {
      return time.length;
    },

    sample(state: SimState): void {
      if (!shouldSample(state)) return;

      // Simulated seconds, from the step rate — never wall clock. 2021 added
      // `timeAccel * recordTimeInterval`, which measured warped time in frames
      // and so labelled the x-axis differently depending on the warp setting.
      elapsed += C.recordTimeInterval * DT;
      time.push(elapsed);

      for (let i = 0; i < CHANNELS.length; i++) {
        const channel = CHANNELS[i]!;
        series[channel.id]!.push(channel.read(state));
      }
    },

    clear(): void {
      time.length = 0;
      for (const channel of CHANNELS) series[channel.id]!.length = 0;
      elapsed = 0;
    },

    copyFrom(other: Recorder): void {
      time.length = 0;
      for (let i = 0; i < other.time.length; i++) time.push(other.time[i]!);
      for (const channel of CHANNELS) {
        const into = series[channel.id]!;
        const from = other.series[channel.id] ?? [];
        into.length = 0;
        for (let i = 0; i < from.length; i++) into.push(from[i]!);
      }
      elapsed = time[time.length - 1] ?? 0;
    },
  };
}

/** One plot: which channels it draws, and how it is labelled. */
export interface PlotSpec {
  readonly id: string;
  readonly title: string;
  readonly channels: readonly string[];
  /** When set, this channel is the x-axis instead of time. */
  readonly xChannel?: string;
  readonly yLabel?: string;
  readonly xLabel?: string;
}

/** The nine plots, titles and groupings from plotting.js. */
export const PLOTS: readonly PlotSpec[] = [
  {
    id: 'flyPath',
    title: 'FlyPath',
    channels: ['altitude'],
    xChannel: 'downRange',
    xLabel: 'Downrange Distance (M)',
    yLabel: 'Altitude (M)',
  },
  { id: 'motionSpeed', title: 'Speed in M/S', channels: ['speedX', 'speedY', 'trueSpeed'] },
  { id: 'propellant', title: 'Propellent in tons', channels: ['propellant'] },
  { id: 'acceleration', title: 'Acceleration', channels: ['g', 'gX', 'gY'] },
  {
    id: 'motionAngle',
    title: 'Angle in Radian',
    channels: ['pitch', 'angleOfMotion', 'angleOfAttack', 'angleInToTheWind'],
  },
  { id: 'controlInput', title: 'ControlInPut', channels: ['pitchControl', 'throttle'] },
  {
    id: 'thermal',
    title: 'Heating&DynamicPressure',
    channels: ['thermalPower', 'dynamicPressure'],
  },
  { id: 'aerodynamicForce', title: 'AerodynamicForce', channels: ['drag', 'lift'] },
  { id: 'altitude', title: 'Altitude', channels: ['altitude'] },
];
