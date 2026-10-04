/** Refactor witness: compare with the original kernel on the current runtime.
 * Case inputs and historical Mac25 receipts were frozen before preparation;
 * fixed runtime outputs are evidence, not cross-platform trajectory goldens. */
import { describe, expect, it, vi } from 'vitest';
import { createScenarioState, getScenario } from '$core/scenarios';
import { cloneState, createInitialState } from '$core/state';
import { rad } from '$core/units';
import { SHIP } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createFallResult, createUnpoweredFallWork } from '$core/control/guidance-physics';
import {advancePrototypeFall as advanceUnpoweredFall,createPrototypeScratch as createBurnScratch,prototypeFallInto as unpoweredFallInto} from './held-interface-swOM3q.prototype.ts';
import * as controls from '$core/physics/damage-controls';
import { damageModelFor } from '$core/physics/damage-model';
import { ComponentFailure, MAX_DAMAGE_COMPONENTS } from '$core/damage-state';
import { originalUnpoweredFall } from '../../../tests/proofs/fixtures/unpowered-fall-original';
import receipts from '../../../tests/proofs/fixtures/unpowered-fall-before-preparation.json';

function source(params: typeof receipts[number]['params']) {
  const model = params.kind === 'ship' ? SHIP : SUPER_HEAVY;
  const state = params.kind === 'ship' ? createScenarioState(getScenario('reentry')!) : createInitialState(123, model);
  Object.assign(state.kinematics, { altitude: params.h, speedX: params.vx, speedY: params.vy });
  state.vehicle.frontFinExtension = params.front; state.vehicle.aftFinExtension = params.aft; state.world.wind = params.wind;
  const parts = state.damage!.components;
  if (params.variant === 'hot') for (const part of parts) part.root.temperature = 1100;
  if (params.variant === 'unavailable') for (const part of parts) part.root.temperature = 1200;
  if (params.variant === 'detached') parts[1]!.attached = false;
  if (params.variant === 'invalid-root') for (const part of parts) { part.root.valid = false; part.root.temperature = NaN; }
  if (params.variant === 'invalid-temperature') for (const part of parts) part.root.temperature = NaN;
  return { state, model };
}
const expected = (row: typeof receipts[number]) => {
  const { state, model } = source(row.params);
  return originalUnpoweredFall(state, model.height / 2, model);
};

describe('owned held-control preparation', () => {
  it.each(receipts)('retains original synchronous and sliced bits for $params.kind/$params.variant', row => {
    const { state, model } = source(row.params), before = cloneState(state);
    const scratch = createBurnScratch(), out = createFallResult();
    if (row.error) {
      expect(() => unpoweredFallInto(state, model.height / 2, scratch, out, model)).toThrow(row.error);
      const work = createUnpoweredFallWork(state, model.height / 2, model);
      expect(() => advanceUnpoweredFall(work, 37, scratch)).toThrow(row.error);
    } else {
      unpoweredFallInto(state, model.height / 2, scratch, out, model);
      expect(out).toEqual(expected(row));
      for (const size of [1, 37, 512]) {
        const work = createUnpoweredFallWork(state, model.height / 2, model);
        while (!work.done) advanceUnpoweredFall(work, size, scratch);
        expect(work.result).toEqual(expected(row));
      }
    }
    expect(state).toEqual(before);
  });

  it('shares scratch without sharing prepared results across interleaved predictions', () => {
    const selected = receipts.filter(row => ['normal', 'nonzero', 'hot'].includes(row.params.variant));
    const jobs = selected.map(row => {
      const { state, model } = source(row.params);
      return createUnpoweredFallWork(state, model.height / 2, model);
    });
    const scratch = createBurnScratch();
    while (jobs.some(job => !job.done)) for (const job of jobs) advanceUnpoweredFall(job, 37, scratch);
    jobs.forEach((job, index) => expect(job.result).toEqual(expected(selected[index]!)));
  });

  it('pays one canonical query for held zero controls while retaining nonzero queries', () => {
    const { state, model } = source(receipts[0]!.params);
    const work = createUnpoweredFallWork(state, model.height / 2, model), scratch = createBurnScratch();
    const spy = vi.spyOn(controls, 'writeDamageControls');
    try {
      advanceUnpoweredFall(work, 37, scratch);
      expect(spy).toHaveBeenCalledTimes(1);
      state.vehicle.frontFinExtension = 25;
      const other = createUnpoweredFallWork(state, model.height / 2, model);
      spy.mockClear(); advanceUnpoweredFall(other, 37, scratch);
      expect(spy).toHaveBeenCalledTimes(74);
    } finally { spy.mockRestore(); }
  });

  it('does not let prepared controls bypass invalid dynamic forcing', () => {
    for (const vx of [NaN, Infinity, -Infinity]) {
      const { state, model } = source(receipts[0]!.params);
      const work = createUnpoweredFallWork(state, model.height / 2, model), scratch = createBurnScratch();
      advanceUnpoweredFall(work, 1, scratch);
      work.vx = vx;
      expect(() => advanceUnpoweredFall(work, 1, scratch)).toThrow('Invalid component control forcing or inventory');
    }
  });

  it('preserves prepared incidence validation for nonfinite pitch', () => {
    for (const pitch of [NaN, Infinity, -Infinity]) {
      const { state, model } = source(receipts[0]!.params);
      const work = createUnpoweredFallWork(state, model.height / 2, model), scratch = createBurnScratch();
      advanceUnpoweredFall(work, 1, scratch);
      expect(work.zeroControlArea).not.toBeNull();
      work.pitch = rad(pitch);
      expect(() => advanceUnpoweredFall(work, 1, scratch)).toThrow('Invalid component control forcing or inventory');
    }
  });

  it('retains exact fall results across incidence boundaries and extreme finite pitch', () => {
    for (const pitch of [0, -0, -Math.PI, -Math.PI / 2, Math.PI / 2, Math.PI, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      const { state, model } = source(receipts[0]!.params);
      state.kinematics.pitch = rad(pitch);
      const out = createFallResult();
      let reference;
      try { reference = originalUnpoweredFall(state, model.height / 2, model); }
      catch (error) {
        expect(error).toBeInstanceOf(RangeError);
        expect(() => unpoweredFallInto(state, model.height / 2, createBurnScratch(), out, model)).toThrow(error as RangeError);
        continue;
      }
      unpoweredFallInto(state, model.height / 2, createBurnScratch(), out, model);
      expect(out).toEqual(reference);
    }
  });

  it('retains force-scale overflow rejection even when dynamic pressure itself is finite', () => {
    const { state, model } = source(receipts[0]!.params);
    const work = createUnpoweredFallWork(state, model.height / 2, model), scratch = createBurnScratch();
    advanceUnpoweredFall(work, 1, scratch);
    work.h = 0; work.vx = 1e154; work.vy = 0;
    expect(() => advanceUnpoweredFall(work, 1, scratch)).toThrow('Attachment load outside the monotone force domain');
  });

  it('proves zero-area independence for actual detached and permanently failed control surfaces', () => {
    for (const kind of ['ship', 'booster']) for (const failed of [false, true]) {
      const { state, model } = source(receipts.find(row => row.params.kind === kind)!.params);
      const controlModel = damageModelFor(model).controls;
      const index = controlModel.columns[0]!.index, component = state.damage!.components[index]!;
      if (failed) component.permanentFailure = ComponentFailure.ProofExceeded;
      else component.attached = false;
      const out = controls.createDamageControlForces(MAX_DAMAGE_COMPONENTS);
      for (const q of [0, Number.MIN_VALUE, .01, 100, 50_000, 1e6]) for (const incidence of [0, .3, 1]) {
        controls.writeDamageControls(state.damage!, controlModel, q, incidence, 0, 0, out);
        expect([out.frontArea, out.aftArea, out.gridLiftArea, out.gridDragArea]).toEqual([0, 0, 0, 0]);
        expect(out.loadedAngles[index]).toBe(0);
        expect((out.proofMask | out.domainMask) & (1 << index)).toBe(0);
      }
      const work = createUnpoweredFallWork(state, model.height / 2, model), scratch = createBurnScratch();
      const spy = vi.spyOn(controls, 'writeDamageControls');
      try {
        advanceUnpoweredFall(work, 37, scratch);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(work.zeroControlArea).toBe(model.maxArea);
      } finally { spy.mockRestore(); }
    }
  });
});
