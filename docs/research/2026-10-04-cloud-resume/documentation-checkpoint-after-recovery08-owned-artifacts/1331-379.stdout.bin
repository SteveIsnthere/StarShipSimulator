import { describe, expect, it } from 'vitest';
import { SHIP } from '$core/vehicle';
import { createVehicleComponents } from '$core/physics/vehicle-components';
import { createDamageState, cloneDamageState } from '$core/damage-state';
import { rad } from '$core/units';
import { planetRadius } from '$core/constants';
import { tangentialAcceleration, verticalGravityAcceleration } from '$core/physics/gravity';
import { createDamageDebrisModel, advanceDamageDebris, dissipateDebrisDrag } from '$core/physics/damage-debris';

function fixture() {
  const partition = createVehicleComponents(SHIP), state = createDamageState(partition, 250);
  const model = createDamageDebrisModel(partition, SHIP);
  const index = partition.components.findIndex(c => c.id === 'ship-front-flap-left');
  const piece = state.debris[index]!;
  state.components[index]!.attached = false;
  Object.assign(piece, { active: true, x: 200, altitude: 10000, speedX: 100, speedY: -50,
    pitch: rad(.3), angularVelocity: .4 });
  return { partition, state, model, piece, index };
}

describe('physical detached component evolution', () => {
  it('derives appendage area from actual model geometry, retaining source mass/inertia', () => {
    const { partition, model, index } = fixture();
    expect(model.pieces[index]!.broadsideArea).toBe(SHIP.frontFinArea / 2);
    expect(model.pieces[index]!.mass).toBe(partition.components[index]!.mass);
    expect(model.pieces[index]!.inertia).toBe(partition.components[index]!.inertia);
  });

  it('quadratic drag has the independent closed-form speed and nonpositive work at every strength', () => {
    for (const beta of [0, .0001, 1, 1e9]) {
      const { piece } = fixture();
      piece.speedX = 300; piece.speedY = -400;
      const work = dissipateDebrisDrag(piece, beta, .25);
      const expected = 500 / (1 + beta * 500 * .25);
      expect(Math.hypot(piece.speedX, piece.speedY)).toBeCloseTo(expected, 10);
      expect(piece.speedX).toBeGreaterThanOrEqual(0);
      expect(piece.speedY).toBeLessThanOrEqual(0);
      expect(work).toBeLessThanOrEqual(0);
      expect(work).toBeCloseTo((expected ** 2 - 500 ** 2) / 2, 8);
    }
  });

  it('preserves vacuum gravity Verlet centroid motion and torque-free spin', () => {
    const { state, model, piece } = fixture();
    piece.altitude = 1e9; piece.speedX = 200; piece.speedY = -100;
    const old = { ...piece }, dt = 1 / 120, r = planetRadius + old.altitude;
    const ax = tangentialAcceleration(r, old.speedX, old.speedY);
    const ay = verticalGravityAcceleration(r, old.speedX);
    advanceDamageDebris(state, model, dt);
    expect(piece.x).toBeCloseTo(old.x + old.speedX * dt + .5 * ax * dt ** 2, 10);
    expect(piece.altitude).toBe(old.altitude + old.speedY * dt + .5 * ay * dt ** 2);
    expect(piece.pitch).toBeCloseTo(old.pitch + old.angularVelocity * dt, 12);
    expect(piece.angularVelocity).toBe(old.angularVelocity);
  });

  it('leaves idle slots and parent thermal/ownership/terminal state untouched and deterministic', () => {
    const { state, model, index } = fixture(), other = cloneDamageState(state), old = cloneDamageState(state);
    advanceDamageDebris(state, model, .25); advanceDamageDebris(other, model, .25);
    expect(state).toEqual(other);
    state.debris.forEach((p, i) => { if (i !== index) expect(p).toEqual(old.debris[i]); });
    expect(state.components).toEqual(old.components);
    expect(state.hull).toEqual(old.hull); expect(state.terminal).toEqual(old.terminal);
    expect(state.revision).toBe(old.revision);
  });

  it('stops impact without bounce or kinetic-energy gain, then stays still', () => {
    const { state, model, piece, index } = fixture();
    const support = model.pieces[index]!.supportRadius;
    piece.altitude = support + .01; piece.speedX = 100; piece.speedY = -100; piece.angularVelocity = 10;
    advanceDamageDebris(state, model, 1 / 120);
    expect(piece.altitude).toBe(support);
    expect(piece.speedX).toBe(0); expect(piece.speedY).toBe(0); expect(piece.angularVelocity).toBe(0);
    const grounded = { ...piece };
    for (let i = 0; i < 120; i++) advanceDamageDebris(state, model, 1 / 120);
    expect(piece).toEqual(grounded);
  });

  it('refines a naturally decelerating atmospheric descent without changing source parameters', () => {
    const initial = fixture();
    initial.piece.speedX = 1000; initial.piece.speedY = -500;
    function solve(dt: number) {
      const state = cloneDamageState(initial.state);
      for (let n = 0; n < Math.round(1 / dt); n++) advanceDamageDebris(state, initial.model, dt);
      return state.debris[initial.index]!;
    }
    const coarse = solve(1 / 30), fine = solve(1 / 60), reference = solve(1 / 480);
    const error = (p: typeof reference) => Math.hypot(p.x - reference.x, p.altitude - reference.altitude,
      p.speedX - reference.speedX, p.speedY - reference.speedY);
    expect(error(fine)).toBeLessThan(error(coarse) * .6);
    expect(fine.speedX).toBeGreaterThan(0);
    expect(fine.speedX).toBeLessThan(initial.piece.speedX);
  });

  it('rejects bad dt/active pose/index before changing any slot; zero dt is identity', () => {
    const { state, model, piece } = fixture();
    const old = cloneDamageState(state);
    for (const dt of [-1, NaN, Infinity]) expect(() => advanceDamageDebris(state, model, dt)).toThrow(RangeError);
    expect(state).toEqual(old);
    advanceDamageDebris(state, model, 0); expect(state).toEqual(old);
    piece.speedX = NaN;
    const invalid = cloneDamageState(state);
    expect(() => advanceDamageDebris(state, model, 1 / 120)).toThrow(RangeError);
    expect(state).toEqual(invalid);
    piece.speedX = 100; piece.componentIndex = -1;
    const wrongIndex = cloneDamageState(state);
    expect(() => advanceDamageDebris(state, model, 1 / 120)).toThrow(RangeError);
    expect(state).toEqual(wrongIndex);
  });
});
