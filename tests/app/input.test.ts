/**
 * M4.3: keybinds, tilt, and the bug the keyboard used to be.
 *
 * 2021's eventListener.js wrote `pitchControl` and `throttle` as globals,
 * bypassing everything the buttons went through. The most visible consequence:
 * `throttle += 10` had no clamp, because the engine limits lived on the slider
 * element's min/max attributes and so applied to dragging the slider and to
 * nothing else. Eleven presses of W left the commanded throttle at 210%, which
 * the thrust model multiplied straight through.
 *
 * In v2 every key produces the same ControlEvent a button would, so it inherits
 * the same clamp. The first test below is that bug, stated as behaviour.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  bindInput,
  bindTilt,
  isAttitudeKey,
  KEY_BINDINGS,
  resolveKeyDown,
  THROTTLE_STEP,
  tiltToPitchControl,
  type InputAction,
} from '$app/input';
import { applyControl, type ControlEvent } from '$ui/controls';
import { createInitialState } from '$core/state';
import { throttleLowerLimit, throttleUpperLimit } from '$core/constants';

describe('the unclamped-throttle bug is closed', () => {
  it('holding the throttle-up key cannot exceed the engine limit', () => {
    const state = createInitialState();

    for (let i = 0; i < 20; i++) {
      const action = resolveKeyDown('w', state.vehicle.throttle);
      applyControl(state, action as ControlEvent);
    }

    expect(state.vehicle.throttle).toBe(throttleUpperLimit);
  });

  it('holding the throttle-down key cannot go below the engine limit', () => {
    const state = createInitialState();

    for (let i = 0; i < 20; i++) {
      const action = resolveKeyDown('s', state.vehicle.throttle);
      applyControl(state, action as ControlEvent);
    }

    expect(state.vehicle.throttle).toBe(throttleLowerLimit);
  });

  it('steps by 10 in between, which is 2021 behaviour', () => {
    const state = createInitialState();
    state.vehicle.throttle = 70;

    applyControl(state, resolveKeyDown('w', state.vehicle.throttle) as ControlEvent);
    expect(state.vehicle.throttle).toBe(70 + THROTTLE_STEP);

    applyControl(state, resolveKeyDown('s', state.vehicle.throttle) as ControlEvent);
    expect(state.vehicle.throttle).toBe(70);
  });
});

describe('the binding table', () => {
  const expected: Array<[string, InputAction]> = [
    ['a', { type: 'pitch', percent: -100 }],
    ['A', { type: 'pitch', percent: -100 }],
    ['ArrowLeft', { type: 'pitch', percent: -100 }],
    ['d', { type: 'pitch', percent: 100 }],
    ['ArrowRight', { type: 'pitch', percent: 100 }],
    ['t', { type: 'pitchHold' }],
    ['T', { type: 'pitchHold' }],
    [' ', { type: 'allRaptors' }],
    ['1', { type: 'raptor', engine: 0 }],
    ['2', { type: 'raptor', engine: 1 }],
    ['3', { type: 'raptor', engine: 2 }],
    ['f', { type: 'fins' }],
    ['r', { type: 'rcs' }],
    ['Backspace', { type: 'boostBack' }],
    ['=', { type: 'zoom', direction: 1 }],
    ['-', { type: 'zoom', direction: -1 }],
  ];

  for (const [key, action] of expected) {
    it(`${JSON.stringify(key)} resolves to ${action.type}`, () => {
      expect(resolveKeyDown(key, 100)).toEqual(action);
    });
  }

  it('is case-insensitive, as 2021 was by listing both cases', () => {
    for (const key of ['a', 'd', 't', 'f', 'r', 'w', 's', 'z', 'x']) {
      expect(resolveKeyDown(key.toUpperCase(), 100), key).toEqual(resolveKeyDown(key, 100));
    }
  });

  it('ignores keys it does not bind', () => {
    for (const key of ['q', 'Tab', 'Enter', '9', 'F5']) {
      expect(resolveKeyDown(key, 100), key).toBeNull();
    }
  });

  it('z and x go to the limits, whatever the current throttle is', () => {
    const state = createInitialState();
    state.vehicle.throttle = 63;

    applyControl(state, resolveKeyDown('z', state.vehicle.throttle) as ControlEvent);
    expect(state.vehicle.throttle).toBe(throttleUpperLimit);

    applyControl(state, resolveKeyDown('x', state.vehicle.throttle) as ControlEvent);
    expect(state.vehicle.throttle).toBe(throttleLowerLimit);
  });

  it('documents every key it binds', () => {
    // KEY_BINDINGS is what M4.6's parity sweep and any future help screen read.
    // It must not drift from the table that actually resolves.
    const documented = KEY_BINDINGS.flatMap((b) => b.keys).map((k) =>
      k === 'Space' ? ' ' : k,
    );
    for (const key of documented) {
      expect(resolveKeyDown(key, 100), key).not.toBeNull();
    }
  });
});

describe('the attitude keys behave like the yoke', () => {
  it('identifies exactly the attitude keys', () => {
    for (const key of ['a', 'A', 'd', 'D', 'ArrowLeft', 'ArrowRight']) {
      expect(isAttitudeKey(key), key).toBe(true);
    }
    for (const key of ['w', 's', 't', ' ', 'ArrowUp']) {
      expect(isAttitudeKey(key), key).toBe(false);
    }
  });

  it('a press grabs the yoke and a release centres it and resumes the hold', () => {
    const state = createInitialState();
    applyControl(state, { type: 'pitchHold' });

    const target = new EventTarget();
    const binding = bindInput(target, {
      control: (e) => applyControl(state, e),
      view: () => {},
      readThrottle: () => state.vehicle.throttle,
    });

    target.dispatchEvent(
      Object.assign(new Event('keydown'), { key: 'a', preventDefault: () => {} }),
    );
    expect(state.autopilot.pitchControl).toBe(-100);
    expect(state.autopilot.manualControlOn).toBe(true);

    state.kinematics.pitch = 0.5 as typeof state.kinematics.pitch;
    target.dispatchEvent(
      Object.assign(new Event('keyup'), { key: 'a', preventDefault: () => {} }),
    );

    expect(state.autopilot.pitchControl).toBe(0);
    expect(state.autopilot.manualControlOn).toBe(false);
    expect(state.autopilot.holdingPitch).toBe(0.5);

    binding.destroy();
  });

  it('stops listening once destroyed', () => {
    const control = vi.fn();
    const target = new EventTarget();
    const binding = bindInput(target, {
      control,
      view: () => {},
      readThrottle: () => 100,
    });

    binding.destroy();
    target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'f' }));

    expect(control).not.toHaveBeenCalled();
  });

  it('suppresses everything while a full-screen panel is open', () => {
    // eventListener.js:3 — `if (!showedMenuView)`. Typing in the scenario editor
    // must not fire the engines.
    const control = vi.fn();
    const target = new EventTarget();
    bindInput(target, {
      control,
      view: () => {},
      isBlocked: () => true,
      readThrottle: () => 100,
    });

    target.dispatchEvent(Object.assign(new Event('keydown'), { key: ' ' }));
    expect(control).not.toHaveBeenCalled();
  });

  it('routes zoom to the view, never to the simulation', () => {
    const control = vi.fn();
    const view = vi.fn();
    const target = new EventTarget();
    bindInput(target, { control, view, readThrottle: () => 100 });

    target.dispatchEvent(Object.assign(new Event('keydown'), { key: '=' }));

    expect(view).toHaveBeenCalledWith({ type: 'zoom', direction: 1 });
    expect(control).not.toHaveBeenCalled();
  });
});

describe('tilt', () => {
  it('reaches full deflection at about 42 degrees, per the x2.4 gain', () => {
    expect(tiltToPitchControl(0, 41, 0)).toBeCloseTo(98.4, 6);
    expect(tiltToPitchControl(0, 42, 0)).toBe(100);
    expect(tiltToPitchControl(0, -42, 0)).toBe(-100);
  });

  it('reads the axis that matches how the device is held', () => {
    // Portrait uses gamma; landscape uses beta, sign depending on which way.
    expect(tiltToPitchControl(10, 20, 0)).toBeCloseTo(48, 6);
    expect(tiltToPitchControl(10, 20, 90)).toBeCloseTo(24, 6);
    expect(tiltToPitchControl(10, 20, 270)).toBeCloseTo(-24, 6);
    expect(tiltToPitchControl(10, 20, 180)).toBeCloseTo(-48, 6);
  });

  it('yields to a hand on the yoke', () => {
    // tools.js:101 — tilt is ignored while manual control is engaged, so a
    // phone on a desk cannot fight the pilot.
    const control = vi.fn();
    const target = new EventTarget();
    let manual = true;

    bindTilt(target, {
      control,
      isManual: () => manual,
      orientationAngle: () => 0,
    });

    target.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 0, gamma: 30 }));
    expect(control).not.toHaveBeenCalled();

    manual = false;
    target.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 0, gamma: 30 }));
    expect(control).toHaveBeenCalledWith({ type: 'pitch', percent: 72 });
  });

  it('ignores an event with no orientation data', () => {
    const control = vi.fn();
    const target = new EventTarget();
    bindTilt(target, { control, isManual: () => false, orientationAngle: () => 0 });

    target.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: null, gamma: null }));
    expect(control).not.toHaveBeenCalled();
  });
});
