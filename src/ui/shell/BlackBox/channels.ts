/**
 * The black box in a player's words and units (docs/design/ia.md, "Black Box").
 *
 * The recorder (src/app/recorder.ts) keeps 2021's channel ids, plot titles and
 * SI internals — radians, newtons — because the CSV export and the golden
 * fixtures are about the recording, not about how it reads. Everything a person
 * sees is mapped here instead: human names, degrees, angles unwrapped so a
 * pitch through ±180° is a curve rather than a full-height spike, forces in kN.
 *
 * Framework-free and cheap to import: the chart code itself loads lazily from
 * ./plots, and nothing here pulls it in.
 */
import { CHANNELS, createRecorder, type Recorder } from '$app/recorder';

export interface ChannelDisplay {
  readonly label: string;
  /** Printed after the value; empty for a quantity with no stated unit. */
  readonly unit: string;
  readonly digits: number;
  /** Recorded in radians: unwrapped, then shown in degrees. */
  readonly angle?: true;
  /** Multiplies the recorded value (N to kN). */
  readonly scale?: number;
}

/** Every recorded channel, by recorder id. */
export const CHANNEL_DISPLAY: Readonly<Record<string, ChannelDisplay>> = {
  pitch: { label: 'Pitch', unit: '°', digits: 1, angle: true },
  angleOfMotion: { label: 'Flight path', unit: '°', digits: 1, angle: true },
  angleOfAttack: { label: 'Angle of attack', unit: '°', digits: 1, angle: true },
  angleInToTheWind: { label: 'Angle to the wind', unit: '°', digits: 1, angle: true },
  speedX: { label: 'Horizontal speed', unit: 'm/s', digits: 1 },
  speedY: { label: 'Vertical speed', unit: 'm/s', digits: 1 },
  trueSpeed: { label: 'Speed', unit: 'm/s', digits: 1 },
  drag: { label: 'Drag', unit: 'kN', digits: 1, scale: 1 / 1000 },
  lift: { label: 'Lift', unit: 'kN', digits: 1, scale: 1 / 1000 },
  altitude: { label: 'Altitude', unit: 'm', digits: 0 },
  downRange: { label: 'Downrange distance', unit: 'm', digits: 0 },
  // The simulation's own heating scale has no physical unit (see core/state.ts).
  thermalPower: { label: 'Heating', unit: '', digits: 0 },
  dynamicPressure: { label: 'Dynamic pressure', unit: 'kPa', digits: 1 },
  g: { label: 'Acceleration', unit: 'g', digits: 2 },
  gX: { label: 'Horizontal acceleration', unit: 'g', digits: 2 },
  gY: { label: 'Vertical acceleration', unit: 'g', digits: 2 },
  pitchControl: { label: 'Attitude input', unit: '%', digits: 0 },
  throttle: { label: 'Throttle', unit: '%', digits: 0 },
  propellant: { label: 'Propellant', unit: 't', digits: 1 },
};

export interface PlotDisplay {
  readonly title: string;
  /** The x axis, when it is not time. */
  readonly xLabel?: string;
  readonly yLabel?: string;
}

/**
 * The nine plots, by recorder PLOTS id. The ids themselves stay: they are the
 * cells' `data-plot` values, which the e2e suite addresses.
 */
export const PLOT_DISPLAY: Readonly<Record<string, PlotDisplay>> = {
  flyPath: { title: 'Flight path', xLabel: 'Downrange distance (m)', yLabel: 'Altitude (m)' },
  motionSpeed: { title: 'Speed (m/s)' },
  propellant: { title: 'Propellant (t)' },
  acceleration: { title: 'Acceleration (g)' },
  motionAngle: { title: 'Pitch and flight path (°)' },
  controlInput: { title: 'Throttle and controls (%)' },
  // Two quantities on one axis, as the recorder groups them.
  thermal: { title: 'Dynamic pressure (kPa) and heating' },
  aerodynamicForce: { title: 'Drag and lift (kN)' },
  altitude: { title: 'Altitude (m)' },
};

const FALLBACK: ChannelDisplay = { label: '', unit: '', digits: 2 };

export function channelDisplay(id: string): ChannelDisplay {
  return CHANNEL_DISPLAY[id] ?? { ...FALLBACK, label: id };
}

/** A value with its unit, as the readout and the legends print it. */
export function formatValue(id: string, value: number): string {
  const display = channelDisplay(id);
  const number = value.toFixed(display.digits);
  // '-0.0' is not a reading anyone took.
  const clean = Number(number) === 0 ? (0).toFixed(display.digits) : number;
  if (display.unit === '') return clean;
  return display.unit === '°' || display.unit === '%' ? `${clean}${display.unit}` : `${clean} ${display.unit}`;
}

/**
 * Remove the ±π wraps from a radian series, in place.
 *
 * A step of more than π between two samples is a wrap, not a turn: the vehicle
 * cannot rotate half a revolution in one recording interval.
 */
export function unwrap(series: number[]): void {
  let offset = 0;
  for (let i = 1; i < series.length; i++) {
    const raw = series[i]! + offset;
    const step = raw - series[i - 1]!;
    if (step > Math.PI) offset -= 2 * Math.PI * Math.round(step / (2 * Math.PI));
    else if (step < -Math.PI) offset += 2 * Math.PI * Math.round(-step / (2 * Math.PI));
    series[i] = series[i]! + offset;
  }
}

const DEGREES = 180 / Math.PI;

/**
 * A copy of a recording in display units, for the plots and the readout.
 *
 * A copy, never the recorder itself: the recorder is the session's live record
 * (the trajectory map reads its arrays) and the CSV must stay the recording,
 * bit for bit. Built once when the black box opens — the flight is paused
 * while it is open — so nothing here runs per frame.
 */
export function displayRecording(recorder: Recorder): Recorder {
  const view = createRecorder();
  view.copyFrom(recorder);
  for (const channel of CHANNELS) {
    const display = CHANNEL_DISPLAY[channel.id];
    const series = view.series[channel.id];
    if (!display || !series) continue;
    if (display.angle) {
      unwrap(series);
      for (let i = 0; i < series.length; i++) series[i] = series[i]! * DEGREES;
    } else if (display.scale !== undefined) {
      for (let i = 0; i < series.length; i++) series[i] = series[i]! * display.scale;
    }
  }
  return view;
}
