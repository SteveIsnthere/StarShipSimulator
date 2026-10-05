import { describe, expect, it } from 'vitest';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { createInitialState } from '$core/state';
import * as C from '$core/constants';
import { createBurnScratch, createFallResult, unpoweredFallInto } from '$core/control/guidance-physics';
import { createPrediction, predict } from '$hud/prediction';
import { createMapRenderer, type MapContext } from '$hud/trajectory-draw';

describe('selected vehicle impact prediction', () => {
  it.each([SHIP, SUPER_HEAVY])('recognises the physical pad before a first step ($id)', model => {
    const out = createPrediction();
    predict(createInitialState(123, model), out, model);
    expect(out.kind).toBe('none');
    expect(out.reason).toBe('on-ground');
  });

  it.each([SHIP, SUPER_HEAVY])('uses selected geometry throughout the fall ($id)', model => {
    const state = createInitialState(123, model);
    state.kinematics.altitude = 1000;
    state.kinematics.distanceToPlanetCenter = C.planetRadius + 1000;
    state.kinematics.speedX = 50;
    state.kinematics.speedY = -100;
    const expected = createFallResult();
    unpoweredFallInto(state, model.height / 2, createBurnScratch(), expected, model);
    expect(expected.reached).toBe(true);
    const out = createPrediction();
    predict(state, out, model);
    expect(out.kind).toBe('touchdown');
    expect(out.altitude).toBe(model.height / 2);
    expect(out.time).toBe(expected.time);
    expect(out.downRange).toBe(expected.downRange);
  });

  it('defaults to the active Ship physical ground height', () => {
    const out = createPrediction();
    predict(createInitialState(), out);
    expect(out.reason).toBe('on-ground');
  });

  it('reads the selected vehicle again when the map redraws', () => {
    const noop = () => {};
    const context: MapContext = {
      canvas: { width: 400, height: 200 }, strokeStyle: '', fillStyle: '',
      lineWidth: 1, font: '', textAlign: 'left', globalAlpha: 1,
      clearRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
      arc: noop, stroke: noop, fill: noop, fillText: noop, setLineDash: noop,
    };
    let model: VehicleDefinition = SHIP;
    const renderer = createMapRenderer({
      context, trail: { downRange: [], altitude: [] },
      get selectedVehicle() { return model; },
    });
    const state = createInitialState();
    state.kinematics.altitude = 30;
    state.kinematics.distanceToPlanetCenter = C.planetRadius + 30;
    state.kinematics.speedY = -1;
    renderer.redraw(state);
    expect(renderer.prediction.kind).toBe('touchdown');
    expect(renderer.prediction.altitude).toBe(26);
    model = SUPER_HEAVY;
    renderer.redraw(state);
    expect(renderer.prediction.kind).toBe('none');
    expect(renderer.prediction.reason).toBe('on-ground');
  });
});
