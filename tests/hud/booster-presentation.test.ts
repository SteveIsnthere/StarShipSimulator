/** Real integrator capture and missed-position control; presentation never secures a vehicle. */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '$core/state';
import { createHotStageMission, stepMission } from '$core/mission';
import { step } from '$core/step';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { SHIP } from '$core/vehicle';
import * as C from '$core/constants';
import { createTimeline, trackFor } from '$hud/timeline';
import { createFlightWatch, debrief } from '$hud/debrief';
import { autopilotLabel } from '$hud/autopilot-mode';
import { figures, OUTCOME_HEADING } from '$ui/shell/Debrief/figures';
import { durationFor, END_MS } from '$hud/haptics';

function approaching(offset = 0) {
  const state = createInitialState(123, SUPER_HEAVY);
  state.kinematics.altitude = 90.501;
  state.kinematics.distanceToPlanetCenter = C.planetRadius + 90.501;
  state.kinematics.downRangeDistance = C.starBaseXPos + offset;
  state.kinematics.speedY = -1;
  state.status.onTheGround = false;
  return state;
}

describe('actual booster outcome presentation', () => {
  it('names an airborne real-step catch and keeps actual final fuel without fake touchdown margins', () => {
    const initial = approaching(), watch = createFlightWatch(), timeline = createTimeline(SUPER_HEAVY);
    watch.observe(initial); timeline.observe(initial);
    const caught = step(initial, 1 / 120, {}, SUPER_HEAVY);
    expect(caught.status.landed).toBe(true);
    expect(caught.status.onTheGround).toBe(false);
    timeline.observe(caught); watch.observe(caught);
    const card = debrief(caught, timeline, watch.last, SUPER_HEAVY);
    expect(card.outcome).toBe('CAUGHT');
    expect(OUTCOME_HEADING[card.outcome]).toBe('Caught');
    expect(card.touchedDown).toBe(false);
    expect(figures(card).map(f => f.key)).not.toContain('vertical');
    expect(card.propellant.value).toBe(caught.vehicle.propellantMass / 1000);
    expect(card.propellant.limit).toBe(3400);
    expect(timeline.has('CAUGHT')).toBe(true);
    expect(timeline.has('TOUCHDOWN')).toBe(false);
    expect(durationFor('CAUGHT')).toBe(END_MS);
    timeline.observe(step(caught, 1 / 120, {}, SUPER_HEAVY));
    expect(timeline.events.filter(e => e.id === 'CAUGHT')).toHaveLength(1);
  });
  it('a missed lug stays airborne, then actual ground failure reads missed catch rather than Ship landing limits', () => {
    let state = approaching(3);
    const timeline = createTimeline(SUPER_HEAVY), watch = createFlightWatch();
    timeline.observe(state); watch.observe(state);
    state = step(state, 1 / 120, {}, SUPER_HEAVY);
    expect(state.status.landed).toBe(false);
    for (let i = 0; i < 2000 && !state.failures.crashed; i++) {
      state = step(state, 1 / 120, {}, SUPER_HEAVY);
      timeline.observe(state); watch.observe(state);
    }
    expect(state.failures.crashed).toBe(true);
    const card = debrief(state, timeline, watch.last, SUPER_HEAVY);
    expect(card.outcome).toBe('CRASH');
    expect(card.reasons).toEqual(['tower catch missed']);
    expect(card.touchedDown).toBe(false);
    expect(timeline.has('LOSS')).toBe(true);
    expect(timeline.has('CAUGHT')).toBe(false);
    expect(timeline.has('TOUCHDOWN')).toBe(false);
  });
  it('observes actual attached, stage-requested and separated states; an unrequested mission never stages', () => {
    let mission = createHotStageMission(123);
    const ship = createTimeline(SHIP), booster = createTimeline(SUPER_HEAVY);
    for (let i = 0; i < 32; i++) {
      mission = stepMission(mission, 1 / 120, {});
      ship.observe(mission.ship, mission); booster.observe(mission.booster, mission);
    }
    expect(ship.events.map(e => e.id)).toEqual(['ATTACHED']);
    expect(booster.events.map(e => e.id)).toEqual(['ATTACHED']);
    for (let i = 0; i < 180; i++) {
      mission = stepMission(mission, 1 / 120, { stage: true });
      ship.observe(mission.ship, mission); booster.observe(mission.booster, mission);
    }
    expect(mission.phase).toBe('separated');
    for (const timeline of [ship, booster]) {
      expect(timeline.events.slice(0, 3).map(e => e.id)).toEqual(['ATTACHED', 'STAGING', 'SEPARATION']);
      expect(timeline.has('LIFTOFF')).toBe(false);
      timeline.reset();
      expect(timeline.events).toHaveLength(0);
    }
  });
  it('a return mode alone does not announce an unpowered burn, and tracks and labels follow actual selection', () => {
    const state = approaching(), timeline = createTimeline(SUPER_HEAVY);
    state.autopilot.boosterPhase = 'terminal';
    timeline.observe(state);
    expect(timeline.has('LANDING BURN')).toBe(false);
    state.engines.running[0] = true; state.forces.thrust = 1;
    timeline.observe(state);
    expect(timeline.has('LANDING BURN')).toBe(true);
    expect(trackFor('rtls', 'super-heavy')).toContain('CAUGHT');
    expect(trackFor('rtls', 'super-heavy')).not.toContain('FLIP');
    expect(trackFor('hot-stage', 'ship', true).slice(0, 3)).toEqual(['ATTACHED', 'STAGING', 'SEPARATION']);
    expect(autopilotLabel('land', 'super-heavy')).toBe('Catch');
    expect(autopilotLabel('land', 'ship')).toBe('Land');
  });
});
