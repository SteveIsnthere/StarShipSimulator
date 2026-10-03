/** Separate recorder, timeline and first-loss witness for each physical body. */
import { createRecorder } from '$app/recorder';
import { createTimeline, type EventId } from '$hud/timeline';
import { createFlightWatch, debrief, type Debrief } from '$hud/debrief';
import type { SimState } from '$core/state';
import type { VehicleDefinition } from '$core/vehicle';
import type { MissionController } from './mission-controller';

function createHistory() {
  return { recorder: createRecorder(), previousRecorder: createRecorder(),
    timeline: createTimeline(), watch: createFlightWatch(), ended: false,
    debrief: null as Debrief | null };
}
type History = ReturnType<typeof createHistory>;

export function createFlightHistories(controller: MissionController, notify: (event: EventId) => void) {
  const ship = createHistory(), booster = createHistory();
  const selected = () => controller.model.id === 'ship' ? ship : booster;

  function observe(history: History, state: SimState, audible: boolean) {
    history.recorder.sample(state);
    history.watch.observe(state);
    const before = history.timeline.events.length;
    history.timeline.observe(state);
    if (audible) for (let i = before; i < history.timeline.events.length; i++) notify(history.timeline.events[i]!.id);
    const ended = state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp;
    if (ended !== history.ended) {
      history.ended = ended;
      history.debrief = ended ? debrief(state, history.timeline, history.watch.last) : null;
    }
  }
  function reset(history: History) {
    if (history.recorder.length > 0) history.previousRecorder.copyFrom(history.recorder);
    history.recorder.clear();
    history.timeline.reset();
    history.watch.reset();
    history.ended = false;
    history.debrief = null;
  }
  return {
    get selected() { return selected(); },
    forVehicle(id: VehicleDefinition['id']) { return id === 'ship' ? ship : booster; },
    observe(state: SimState) {
      const mission = controller.mission;
      if (!mission) observe(selected(), state, true);
      else {
        observe(ship, mission.ship, controller.model.id === 'ship');
        observe(booster, mission.booster, controller.model.id === 'super-heavy');
      }
    },
    reset() { reset(ship); reset(booster); },
  };
}
