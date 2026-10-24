/** Refactor: the vector form must retain both original scalar outputs exactly. */
import { expect, it } from 'vitest';
import { getHorizontalAcceleration, getVerticalAcceleration, writeAccelerationComponents, type AccelerationInputs } from '$core/physics/components';
import { rad } from '$core/units';

const out = { x: 0, y: 0 };
function verify(input: AccelerationInputs, gravity: number) {
  const x = getHorizontalAcceleration(input), y = getVerticalAcceleration(input, gravity);
  writeAccelerationComponents(input, gravity, out);
  expect(Object.is(out.x, x)).toBe(true);
  expect(Object.is(out.y, y)).toBe(true);
}
function input(angle: number, load: number, fixed: number): AccelerationInputs {
  return { angleOfMotion: rad(angle), angleOfAttack: rad(angle * .73),
    gimbalPointingDirection: rad(angle * -.19), pitch: rad(angle * 1.31),
    aerodynamicDragAcceleration: load, aerodynamicLiftAcceleration: -load,
    thrustAcceleration: load, fixedThrustAcceleration: fixed };
}
const bits = new DataView(new ArrayBuffer(8));
function adjacent(value: number, up: boolean) {
  if (value === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  bits.setFloat64(0, value);
  bits.setBigUint64(0, bits.getBigUint64(0) + (up === (value > 0) ? 1n : -1n));
  return bits.getFloat64(0);
}

it('matches scalar bits through dense angles, quadrant edges, cancellation and signed zeros', () => {
  for (let index = 0; index <= 8192; index++) {
    const angle = -2 * Math.PI + index / 8192 * 4 * Math.PI;
    for (const fixed of [0, -0, .37, -.37]) verify(input(angle, 9.807, fixed), 9.807);
  }
  for (const edge of [-Math.PI, -Math.PI / 2, -0, 0, Math.PI / 2, Math.PI]) {
    for (const angle of [adjacent(edge, false), edge, adjacent(edge, true)]) {
      for (const load of [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, 1, -1, 1e-200, 1e200]) {
        for (const fixed of [0, -0, load]) {
          const state = input(angle, load, fixed);
          state.angleOfAttack = rad(angle); state.gimbalPointingDirection = rad(angle);
          for (const gravity of [0, -0, 9.807, -load]) verify(state, gravity);
        }
      }
    }
  }
});

it('retains individual nonfinite inputs and conditional fixed-thrust arithmetic', () => {
  const base = input(.3, 2, 0);
  for (const key of Object.keys(base) as (keyof AccelerationInputs)[]) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const state = { ...base, [key]: value } as AccelerationInputs;
      for (const fixed of [0, -0, 3]) {
        if (key !== 'fixedThrustAcceleration') state.fixedThrustAcceleration = fixed;
        verify(state, 9.807);
      }
    }
  }
  for (const gravity of [NaN, Infinity, -Infinity]) verify(base, gravity);
});
