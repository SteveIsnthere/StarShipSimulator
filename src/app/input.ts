/**
 * Keyboard, tilt and pointer input.
 *
 * All of it turns into `ControlEvent`s and a small set of view actions, so the
 * keyboard is not a second way to drive the simulation — it is the same way.
 * 2021 had two: eventListener.js wrote `pitchControl` and `throttle` directly as
 * globals, bypassing everything the buttons went through, which is how the
 * keyboard ended up able to do things no button could.
 *
 * That last part is not a figure of speech. `throttle += 10` on a keypress had
 * no clamp — the engine limits lived on the slider element's `min`/`max`
 * attributes, so they applied to dragging the slider and to nothing else. Eleven
 * presses of W put the commanded throttle at 210%, which the thrust model was
 * happy to multiply straight through. See KEY_BINDINGS below.
 *
 * The bindings themselves are 2021's, key for key.
 */
import type { ControlEvent } from '$ui/controls';

/** Actions that belong to the view rather than the simulation. */
export type ViewAction = { readonly type: 'zoom'; readonly direction: 1 | -1 };

export type InputAction = ControlEvent | ViewAction;

export interface InputHandlers {
  /** Apply a simulation command. */
  control(event: ControlEvent): void;
  /** Apply a view action. */
  view(action: ViewAction): void;
  /** True while a full-screen panel is open; input is suppressed. */
  isBlocked?(): boolean;
  /** Current commanded throttle, for the relative +/- 10 keys. */
  readThrottle(): number;
}

/**
 * eventListener.js:2 — the keydown map.
 *
 * `event.key` is compared case-insensitively rather than by listing both cases,
 * which is what 2021 did (`'a' || 'A'`). Same behaviour, half the table.
 */
export const THROTTLE_STEP = 10;

/** Keys that command attitude, and the direction each commands. */
const ATTITUDE_KEYS: Record<string, -100 | 100> = {
  a: -100,
  arrowleft: -100,
  d: 100,
  arrowright: 100,
};

/**
 * Everything else, as key -> event.
 *
 * Throttle keys are handled separately because two of them are relative to the
 * current value and so cannot be a constant.
 */
const SIMPLE_KEYS: Record<string, InputAction> = {
  t: { type: 'pitchHold' },
  ' ': { type: 'allRaptors' },
  '1': { type: 'raptor', engine: 0 },
  '2': { type: 'raptor', engine: 1 },
  '3': { type: 'raptor', engine: 2 },
  f: { type: 'fins' },
  r: { type: 'rcs' },
  backspace: { type: 'boostBack' },
  '=': { type: 'zoom', direction: 1 },
  '-': { type: 'zoom', direction: -1 },
};

/** Keys that set the throttle to an absolute value. */
const THROTTLE_ABSOLUTE: Record<string, 'max' | 'min'> = { z: 'max', x: 'min' };

/** Keys that step the throttle. */
const THROTTLE_RELATIVE: Record<string, 1 | -1> = {
  shift: 1,
  arrowup: 1,
  w: 1,
  control: -1,
  arrowdown: -1,
  s: -1,
};

/**
 * The key that puts the throttle at maximum.
 *
 * NAMED, because M12.6 needed to quote it in the first-flight hint and reached
 * for `KEY_BINDINGS.find((b) => b.does === 'throttle to maximum')` — a lookup
 * by PROSE, which fails silently the day someone rewords a description. This
 * file exists because a help screen that can drift is worse than none; a lookup
 * that can drift is the same defect one level down.
 */
export const MAX_THROTTLE_KEY = 'Z';

/** The full binding table, for documentation and for the parity sweep in M4.6. */
export const KEY_BINDINGS: ReadonlyArray<{ keys: string[]; does: string }> = [
  { keys: ['A', 'ArrowLeft'], does: 'pitch left, hold' },
  { keys: ['D', 'ArrowRight'], does: 'pitch right, hold' },
  { keys: ['W', 'ArrowUp', 'Shift'], does: `throttle +${THROTTLE_STEP}` },
  { keys: ['S', 'ArrowDown', 'Control'], does: `throttle -${THROTTLE_STEP}` },
  { keys: [MAX_THROTTLE_KEY], does: 'throttle to maximum' },
  { keys: ['X'], does: 'throttle to minimum' },
  { keys: ['T'], does: 'toggle attitude hold' },
  { keys: ['Space'], does: 'toggle all Raptors' },
  { keys: ['1', '2', '3'], does: 'toggle one Raptor' },
  { keys: ['F'], does: 'toggle fins' },
  { keys: ['R'], does: 'toggle RCS' },
  { keys: ['Backspace'], does: 'toggle boost-back' },
  { keys: ['=', '-'], does: 'zoom in / out' },
];

/** Lower-cased so 'a' and 'A' are one entry rather than two, as 2021 listed them. */
function normalise(key: string): string {
  return key.toLowerCase();
}

/**
 * Resolve a keydown to an action, or null.
 *
 * Pure, so the whole binding table is testable without a DOM or a simulation.
 */
export function resolveKeyDown(key: string, currentThrottle: number): InputAction | null {
  const k = normalise(key);

  const attitude = ATTITUDE_KEYS[k];
  if (attitude !== undefined) return { type: 'pitch', percent: attitude };

  const absolute = THROTTLE_ABSOLUTE[k];
  if (absolute !== undefined) {
    // Clamped in core, so 'max'/'min' are expressed as values outside the range
    // rather than by importing the limits here.
    return { type: 'throttle', percent: absolute === 'max' ? Infinity : -Infinity };
  }

  const relative = THROTTLE_RELATIVE[k];
  if (relative !== undefined) {
    return { type: 'throttle', percent: currentThrottle + relative * THROTTLE_STEP };
  }

  return SIMPLE_KEYS[k] ?? null;
}

/** True if this key releases the attitude command. eventListener.js:104. */
export function isAttitudeKey(key: string): boolean {
  return ATTITUDE_KEYS[normalise(key)] !== undefined;
}

/**
 * tools.js:101 — map a device orientation to a yoke position.
 *
 * The x2.4 gain and the +/-100 clamp are 2021's: a 42-degree tilt is full
 * deflection. Which axis is "tilt" depends on how the device is held, and
 * `window.orientation` is the deprecated API 2021 used; the modern equivalent
 * is `screen.orientation.angle`, which reports the same four values, so the
 * branch structure is unchanged.
 *
 * @param beta rotation about the device's x-axis, degrees
 * @param gamma rotation about the device's y-axis, degrees
 * @param orientationAngle 0, 90, 180 or 270
 */
export function tiltToPitchControl(
  beta: number,
  gamma: number,
  orientationAngle: number,
): number {
  let tiltAngle: number;
  if (orientationAngle === 90) tiltAngle = beta;
  else if (orientationAngle === 270 || orientationAngle === -90) tiltAngle = -beta;
  else if (orientationAngle === 0) tiltAngle = gamma;
  else tiltAngle = -gamma;

  const inputAngle = tiltAngle * 2.4;
  if (inputAngle >= 100) return 100;
  if (inputAngle <= -100) return -100;
  return inputAngle;
}

export interface InputBinding {
  destroy(): void;
}

/**
 * Attach the listeners. Returns a handle that removes them again.
 *
 * The listeners are attached once, at startup, and they do not read the DOM:
 * they translate an event into an action and hand it over.
 */
export function bindInput(target: EventTarget, handlers: InputHandlers): InputBinding {
  const blocked = () => handlers.isBlocked?.() === true;

  const dispatch = (action: InputAction) => {
    if (action.type === 'zoom') handlers.view(action);
    else handlers.control(action);
  };

  const onKeyDown = (event: Event) => {
    const key = (event as KeyboardEvent).key;
    if (key === undefined || blocked()) return;

    const action = resolveKeyDown(key, handlers.readThrottle());
    if (!action) return;

    // Space scrolls the page and Backspace navigates back in some browsers.
    // 2021 got away with neither because the body could not scroll; being
    // explicit costs nothing and does not depend on the layout staying that way.
    if (key === ' ' || key === 'Backspace') event.preventDefault();

    // An attitude key takes the yoke, exactly as grabbing the slider does.
    if (isAttitudeKey(key)) handlers.control({ type: 'yokeGrab' });

    dispatch(action);
  };

  const onKeyUp = (event: Event) => {
    const key = (event as KeyboardEvent).key;
    if (key === undefined || blocked() || !isAttitudeKey(key)) return;

    // eventListener.js:104 — centre the yoke, adopt the attitude, resume auto.
    handlers.control({ type: 'pitch', percent: 0 });
    handlers.control({ type: 'yokeRelease' });
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
  };
}

/**
 * Attach device-orientation tilt control. Separate from the keyboard because it
 * needs permission on iOS and because it must not fight a hand on the yoke.
 */
export interface TiltOptions {
  control(event: ControlEvent): void;
  /** True while the pilot is holding the yoke; tilt yields to it. */
  isManual(): boolean;
  orientationAngle(): number;
}

export function bindTilt(target: EventTarget, options: TiltOptions): InputBinding {
  const onOrientation = (event: Event) => {
    // tools.js:101 — tilt is ignored while manual control is engaged.
    if (options.isManual()) return;

    const e = event as DeviceOrientationEvent;
    if (e.beta === null || e.gamma === null) return;

    options.control({
      type: 'pitch',
      percent: tiltToPitchControl(e.beta, e.gamma, options.orientationAngle()),
    });
  };

  target.addEventListener('deviceorientation', onOrientation);
  return {
    destroy() {
      target.removeEventListener('deviceorientation', onOrientation);
    },
  };
}
