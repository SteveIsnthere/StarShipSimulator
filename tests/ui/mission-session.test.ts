/** Framework-free routing contract before session/canvas composition. */
import { describe, expect, it } from 'vitest';
import { createMissionController } from '$ui/session/mission-controller';
import { createIntroState, getScenario } from '$core/scenarios';
import { DT } from '$app/loop';
import { createSimDebug } from '$app/debug';

const stage = (controller: ReturnType<typeof createMissionController>) => {
  controller.stage();
  for (let i = 0; i < 240 && controller.mission?.phase !== 'separated'; i++) controller.advance(DT);
};

describe('actual selected-model mission routing', () => {
  it('routes debug fixed steps through both actual mission bodies', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    flight.stage();
    const debug = createSimDebug({ loop: () => flight.loop, startScenario: () => {}, setPaused: () => {},
      advanceStep: () => { flight.advance(DT); } });
    debug.step(180);
    expect(flight.mission!.phase).toBe('separated');
    expect(flight.mission!.ship.world.environmentTime).toBe(flight.loop.simulatedTime);
    expect(flight.mission!.booster.world.environmentTime).toBe(flight.loop.simulatedTime);
    expect(flight.loop.totalSteps).toBe(180);
  });

  it('keeps Stage pending through a pause and advances the unselected body after release', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    flight.stage();
    flight.advance(1, { paused: true });
    expect(flight.mission!.stageRequested).toBe(false);
    flight.advance(DT);
    expect(flight.mission!.stageRequested).toBe(true);
    stage(flight);
    flight.selectVehicle('super-heavy');
    const previousShip = flight.mission!.ship;
    flight.advance(DT);
    expect(flight.mission!.ship.world.environmentTime).toBe(previousShip.world.environmentTime + DT);
    expect(flight.loop.state).toBe(flight.mission!.booster);
  });

  it('does not advertise an automatic flight mode on the attached demonstration', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    flight.emit({ type: 'autoLand' });
    expect(flight.loop.state.autopilot.autoLandOn).toBe(false);
    stage(flight);
    flight.emit({ type: 'autoLand' });
    expect(flight.loop.state.autopilot.autoLandOn).toBe(true);
  });

  it('preserves the original intro and starts physical33-engine booster presets', () => {
    const flight = createMissionController();
    expect(flight.loop.state).toEqual(createIntroState());
    expect(flight.model.id).toBe('ship');
    flight.startFlight(getScenario('booster-sep')!);
    expect(flight.model.id).toBe('super-heavy');
    expect(flight.loop.state.engines.running).toHaveLength(33);
    expect(flight.loop.state.vehicle.propellantMass).toBe(500_000);
    expect(flight.mission).toBeUndefined();
    flight.startFlight({ ...getScenario('booster-sep')!, id: 'custom', basedOn: 'booster-sep', propellant: 3000 });
    expect(flight.loop.state.vehicle.propellantMass).toBe(3_000_000);
  });

  it('advances a booster through its model instead of the compatibility Ship default', () => {
    const flight = createMissionController();
    flight.startFlight(getScenario('rtls')!);
    flight.emit({ type: 'allRaptors' });
    for (let i = 0; i < 180; i++) flight.advance(DT);
    expect(flight.loop.state.engines.running.filter(Boolean)).toHaveLength(13);
    expect(flight.loop.state.vehicle.vehicleMass).toBe(200_000 + flight.loop.state.vehicle.propellantMass);
    expect(flight.loop.state.world.environmentTime).toBe(flight.loop.simulatedTime);
  });

  it('routes engine/throttle/pitch to only the selected real vehicle and changes selection without stepping', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    const boosterBefore = structuredClone(flight.mission!.booster);
    flight.emit({ type: 'throttle', percent: 40 });
    flight.emit({ type: 'pitch', percent: 30 });
    flight.emit({ type: 'raptor', engine: 5 });
    expect(flight.mission!.ship.vehicle.throttle).toBe(40);
    expect(flight.mission!.ship.autopilot.pitchControl).toBe(30);
    expect(flight.mission!.ship.engines.ignitionCountdown[5]).not.toBeNull();
    expect(flight.mission!.booster).toEqual(boosterBefore);
    const shipBefore = structuredClone(flight.mission!.ship);
    const elapsed = flight.mission!.elapsedTime;
    flight.selectVehicle('super-heavy');
    expect(flight.model.id).toBe('super-heavy');
    expect(flight.loop.state).toBe(flight.mission!.booster);
    flight.emit({ type: 'throttle', percent: 70 });
    expect(flight.mission!.ship).toEqual(shipBefore);
    expect(flight.mission!.booster.vehicle.throttle).toBe(70);
    expect(flight.mission!.elapsedTime).toBe(elapsed);
  });

  it('stages both physical trajectories on the same clock, pauses both, and restores attachment on restart', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    const initial = structuredClone(flight.mission);
    stage(flight);
    expect(flight.mission!.phase).toBe('separated');
    expect(flight.mission!.ship.world.environmentTime).toBe(flight.mission!.booster.world.environmentTime);
    const snapshot = structuredClone(flight.mission);
    flight.advance(1, { paused: true });
    expect(flight.mission).toEqual(snapshot);
    flight.selectVehicle('super-heavy');
    flight.startHotStage(123);
    expect(flight.mission).toEqual(initial);
    expect(flight.model.id).toBe('ship');
    expect(flight.loop.totalSteps).toBe(0);
  });

  it('feeds every selected physical step to the recorder callback at every batching/warp setting', () => {
    const flight = createMissionController();
    flight.startHotStage(123);
    flight.stage();
    let calls = 0;
    flight.advance(1 / 30, { timeWarp: 4, onStep: state => {
      calls++;
      expect(state).toBe(flight.loop.state);
      expect(state.world.environmentTime).toBe(flight.mission!.elapsedTime);
    } });
    expect(calls).toBe(16);
    expect(flight.loop.totalSteps).toBe(16);
    expect(flight.loop.state.world.environmentTime).toBe(flight.loop.simulatedTime);
  });
});
