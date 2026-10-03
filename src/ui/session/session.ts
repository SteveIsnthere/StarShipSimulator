/**
 * The flight session: everything between the simulation and the interface.
 *
 * It owns the loop, the scene, the flight recorder, the mission timeline,
 * sound, haptics and input, runs the one requestAnimationFrame tick, and
 * exposes commands plus a small store (store.ts) for what the interface
 * renders. It is framework-free: the React shell mounts it on a canvas, hands
 * it the DOM targets the HUD binders write to, and calls its commands. Its
 * listeners on the document (keys, gestures, input) are ./document-wiring.ts.
 *
 * From the information architecture (docs/design/ia.md): an open layer (menu,
 * black box, guide) pauses the flight.
 */
import { DT, type LoopState, type AdvanceResult } from '$app/loop';
import { installSimDebug } from '$app/debug';
import { type ControlEvent } from '$app/controls';
import { toLoopOptions, type EditorFields, type TimeSetting } from '$app/menu';
import { vehicleHeight } from '$core/constants';
import { toggleRandomFailure } from '$core/control/commands';
import {
  getScenario,
  type ScenarioPreset,
} from '$core/scenarios';
import type { SimState } from '$core/state';
import type { VehicleDefinition } from '$core/vehicle';
import { createView, type ViewApp } from '$view/app';
import { modeZoom, type CameraMode } from '$view/camera';
import {
  createHudBinder,
  createIndicatorBinder,
  createMetricBinder,
  type AttributeTarget,
  type ClassTarget,
  type HudBinder,
  type IndicatorBinder,
  type MetricBinder,
  type TextTarget,
} from '$hud/binder';
import { createTimeline, type EventId } from '$hud/timeline';
import { createTimelineBinder, type TimelineBinder } from '$hud/timeline-binder';
import { browserHost, createHaptics } from '$hud/haptics';
import { autopilotMode } from '$hud/autopilot-mode';
import {
  createMapRenderer,
  type MapRenderer,
  type MapRendererOptions,
  type MapSurface,
} from '$hud/trajectory-draw';
import { type Recorder } from '$app/recorder';
import {
  createAudioEngine,
  type AudioEngine,
} from '$audio/engine';
import { createScene } from './scene';
import { createCameraFollow } from './camera-follow';
import { createPresentationProbe } from './debug-presentation';
import { wireDocument } from './document-wiring';
import { createSessionStore, isPaused, type Layer, type SessionStore } from './store';

import { HINT_FITS, createPreferenceCommands, readSessionPreferences } from './preferences';
import { createMissionController } from './mission-controller';
import { configuredFlight } from './configure-flight';
import { createFlightHistories } from './flight-histories';
import type { MissionState } from '$core/mission';
import { createEngineGroupBinder, type EngineGroup, type EngineGroupBinder } from '$hud/engine-groups';
import { indicatorsFor } from '$hud/indicators';
import { metricsFor } from '$hud/metrics';
export { HINT_FITS } from './preferences';

export interface Session {
  readonly store: SessionStore;
  /** The live flight. Read it; change it only through the commands. */
  readonly loop: LoopState;
  readonly model: VehicleDefinition;
  readonly mission: MissionState | undefined;
  startHotStage(seed?: number): void;
  selectVehicle(id: VehicleDefinition['id']): void;
  stage(): void;
  /** Advance the canonical session clock; also works without a canvas. */
  advance(frameTime: number): AdvanceResult;
  readonly timeline: ReturnType<typeof createTimeline>;
  readonly recorder: Recorder;
  /** The flight before this one, for the black box's ghost. */
  readonly previousRecorder: Recorder;

  /** Start the loop, the scene and input on `canvas`. Resolves to a teardown. */
  mount(canvas: HTMLCanvasElement): Promise<() => void>;

  // The HUD's DOM targets, handed over once the interface has rendered them.
  bindHud(
    resolve: (id: string) => { value: TextTarget | null; unit: TextTarget | null },
    resolveMetric: (id: string) => AttributeTarget | null,
  ): void;
  bindIndicators(resolve: (id: string) => ClassTarget | null): void;
  bindEngineGroups(surface: 'controls' | 'hud', resolve: (group: EngineGroup) => TextTarget | null): void;
  bindTimeline(
    track: readonly EventId[],
    resolve: (id: string) => AttributeTarget | null,
    text: (id: 'now' | 'next') => TextTarget | null,
  ): void;
  bindMap(surface: MapSurface | null): void;

  // Commands.
  emit(event: ControlEvent): void;
  startFlight(preset: ScenarioPreset): void;
  configure(fields: EditorFields): void;
  restart(): void;
  openLayer(layer: Exclude<Layer, null>): void;
  closeLayer(): void;
  togglePause(): void;
  toggleCinematic(): void;
  selectCameraMode(mode: CameraMode): void;
  toggleMuted(): void;
  setVolume(level: number, remember?: boolean): void;
  setTime(time: TimeSetting): void;
  toggleRandomFailure(): void;
  toggleTiltControl(): void;
  restoreDefaults(): void;
  dismissHint(): void;
  dismissDebrief(): void;
  zoom(direction: 1 | -1): void;
  /** The live throttle command, for controls that step it. */
  readThrottle(): number;
}

export function createSession(): Session {
  const store = createSessionStore(readSessionPreferences());
  const set = store.setState;
  const get = store.getState;

  const haptics = createHaptics(browserHost());
  const audio: AudioEngine = createAudioEngine({
    host: {
      create: () => {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        return new Ctor!() as never;
      },
    },
  });

  // The flight exists from construction, so commands work before (and without) a canvas.
  const controller = createMissionController();
  let hotStageSeed: number | undefined;
  const loop = controller.loop;
  const histories = createFlightHistories(controller, event => haptics.event(event));
  let view: ViewApp | undefined;
  let resetSceneForFlight: (() => void) | undefined;
  let hud: HudBinder | undefined;
  let metrics: MetricBinder | undefined;
  let indicators: IndicatorBinder | undefined;
  let controlGroups: EngineGroupBinder | undefined;
  let hudGroups: EngineGroupBinder | undefined;
  let timelineBinder: TimelineBinder | undefined;
  // A browser without Web Audio still flies, silently: an unlock that cannot
  // build a context is not an error worth surfacing.
  const unlockAudio = () => void audio.unlock().catch(() => {});

  let mapRenderer: MapRenderer | undefined;
  let mapSurface: MapSurface | null = null;
  let mapOptions: MapRendererOptions | undefined;
  const presentationProbe = createPresentationProbe();

  const camera = createCameraFollow();

  /**
   * Once per simulation step, not per frame: the recorder samples steps, and
   * the camera's second-order follow has to see every position the vehicle
   * occupied for its framing to be independent of the frame rate.
   */
  const onStep = (state: SimState) => {
    histories.observe(state);
    if (!view) return;
    camera.step(view, state, controller.mission);
  };

  // Rebuilt only when the time setting or the pause changes, never per frame.
  let loopOptions = { ...toLoopOptions(get().time), onStep, paused: isPaused(get()) };
  store.subscribe((s, prev) => {
    if (s.time !== prev.time || isPaused(s) !== isPaused(prev)) {
      loopOptions = { ...toLoopOptions(s.time), onStep, paused: isPaused(s) };
    }
  });

  const applyCameraMode = () => {
    const s = get();
    const effective: CameraMode = s.cinematic ? s.cameraMode : 'follow';
    camera.setMode(effective);
    view?.setModeZoom(modeZoom(effective));
  };

  /** The store's autopilot field follows the flight; a write only on a change. */
  const syncAutopilot = () => {
    const mode = autopilotMode(loop.state);
    if (mode !== get().autopilot) set({ autopilot: mode });
  };

  const beginFlight = (preset: ScenarioPreset) => {
    resetSceneForFlight?.();
    histories.reset();
    const fresh = loop.state;
    fresh.failures.randomFailure = get().randomFailure;
    if (view) camera.reset(view, fresh, controller.mission);
    audio.resetFlight();
    if (mapSurface) mapSurface.dirty = true;
    set({ preset, selectedVehicle: controller.model.id, flightOver: false, debrief: null });
    timelineBinder?.follow(histories.selected.timeline);
    if (mapSurface) session.bindMap(mapSurface);
    syncMission();
    syncAutopilot();
  };

  const syncMission = () => {
    const phase = controller.mission?.phase ?? null;
    const stageRequested = controller.stagePending || (controller.mission?.stageRequested ?? false);
    const stagingFailed = controller.mission?.stagingFailed ?? false;
    if (phase !== get().missionPhase || stageRequested !== get().stageRequested || stagingFailed !== get().stagingFailed)
      set({ missionPhase: phase, stageRequested, stagingFailed });
    const state = loop.state;
    const over = state.status.landed || state.failures.crashed || state.failures.inFlightBreakUp || state.failures.fuelRunOut;
    if (over !== get().flightOver) set({ flightOver: over });
    if (histories.selected.debrief !== get().debrief) set({ debrief: histories.selected.debrief });
    syncAutopilot();
  };
  const startFlight = (preset: ScenarioPreset) => { controller.startFlight(preset); beginFlight(preset); };
  const startHotStage = (seed?: number) => {
    hotStageSeed = seed;
    controller.startHotStage(seed);
    beginFlight({ ...getScenario('booster-sep')!, id: 'hot-stage', name: 'Hot staging',
      description: 'Stage two physical vehicles, then select which one to fly.' });
    if (controller.mission) controller.mission.booster.failures.randomFailure = get().randomFailure;
  };

  const preferences = createPreferenceCommands(store, audio, applyCameraMode, unlockAudio);

  const session: Session = {
    store,
    loop,
    get model() { return controller.model; },
    get mission() { return controller.mission; },
    advance(frameTime) {
      const result = controller.advance(frameTime, loopOptions);
      syncMission();
      return result;
    },
    get timeline() { return histories.selected.timeline; },
    get recorder() { return histories.selected.recorder; },
    get previousRecorder() { return histories.selected.previousRecorder; },

    bindHud(resolve, resolveMetric) {
      hud?.destroy();
      metrics?.destroy();
      hud = createHudBinder({ resolve });
      metrics = createMetricBinder({ resolve: resolveMetric, metrics: metricsFor(controller.model) });
    },
    bindIndicators(resolve) {
      indicators?.destroy();
      indicators = createIndicatorBinder({ resolve, indicators: indicatorsFor(controller.model) });
    },
    bindEngineGroups(surface, resolve) {
      if (surface === 'controls') { controlGroups?.destroy(); controlGroups = createEngineGroupBinder(resolve); }
      else { hudGroups?.destroy(); hudGroups = createEngineGroupBinder(resolve); }
    },
    bindTimeline(track, resolve, text) {
      timelineBinder?.destroy();
      timelineBinder = createTimelineBinder({ timeline: histories.selected.timeline, resolveText: text });
      timelineBinder.rebind(track, resolve);
    },
    bindMap(surface) {
      mapSurface = surface;
      if (!surface) return; // a refused 2D context: everything else still flies
      mapOptions = {
        context: surface.context,
        trail: { downRange: histories.selected.recorder.series['downRange']!, altitude: histories.selected.recorder.series['altitude']! },
        scale: surface.scale,
        status: surface.status,
      };
      mapRenderer = createMapRenderer(mapOptions);
    },

    emit(event) {
      controller.emit(event);
      syncAutopilot();
    },
    startFlight,
    startHotStage,
    stage() { controller.stage(); syncMission(); },
    selectVehicle(id) {
      if (!controller.mission || id === controller.model.id) return;
      controller.selectVehicle(id);
      if (view) camera.select(view, loop.state);
      set({ selectedVehicle: controller.model.id });
      timelineBinder?.follow(histories.selected.timeline);
      timelineBinder?.update();
      if (mapSurface) { mapSurface.dirty = true; session.bindMap(mapSurface); }
      syncMission();
    },
    configure(fields) {
      startFlight(configuredFlight(fields, get().preset, controller));
      set({ layer: null });
    },
    restart() {
      if (controller.mission) startHotStage(hotStageSeed);
      else startFlight(get().preset);
    },
    openLayer(layer) {
      set({ layer });
    },
    closeLayer() {
      set({ layer: null });
    },
    togglePause() {
      set({ playerPaused: !get().playerPaused });
    },
    setTime(time) {
      set({ time });
    },
    toggleRandomFailure() {
      toggleRandomFailure(loop.state);
      const mission = controller.mission;
      if (mission) {
        const other = controller.model.id === 'ship' ? mission.booster : mission.ship;
        if (other.failures.randomFailure !== loop.state.failures.randomFailure) toggleRandomFailure(other);
      }
      set({ randomFailure: loop.state.failures.randomFailure });
    },
    toggleTiltControl() {
      set({ tiltControl: !get().tiltControl });
    },
    ...preferences,
    dismissDebrief() {
      histories.dismissDebrief();
      set({ debrief: null });
    },
    zoom(direction) {
      view?.zoom(direction);
    },
    readThrottle() {
      return loop.state.vehicle.throttle;
    },

    async mount(canvas) {
      let disposed = false;
      let frame = 0;
      const live = loop;
      const initial = live.state;
      const debugLoopOptions = { onStep };
      installSimDebug(window, import.meta.env.DEV, {
        loop: () => loop,
        startScenario: (id, overrides) => {
          if (id === 'hot-stage') { startHotStage(); return; }
          const preset = getScenario(id);
          if (!preset) throw new Error(`no scenario '${id}'`);
          startFlight({ ...preset, ...overrides });
        },
        setPaused: (debugPaused) => set({ debugPaused }),
        onStep,
        advanceStep: () => { controller.advance(DT, debugLoopOptions); syncMission(); },
        presentation: presentationProbe.presentation,
        setParticlesVisible: presentationProbe.setParticlesVisible,
      });

      const v = await createView({
        canvas,
        vehicleHeight,
        downRangeDistance: initial.kinematics.downRangeDistance,
        speedY: initial.kinematics.speedY,
      });
      view = v;
      applyCameraMode();
      const scene = await createScene(v, () => disposed);
      if (!scene || disposed) {
        v.destroy();
        return () => {};
      }
      resetSceneForFlight = scene.resetFlight;
      presentationProbe.bind(scene);

      // The canvas's parent owns its box (the shell insets it above the phone's
      // bottom chrome); Pixi pins the canvas's own inline size, so the parent is
      // what to measure. Without one, or without ResizeObserver, the window.
      const box = canvas.parentElement;
      const onResize = () =>
        box ? scene.resize(box.clientWidth, box.clientHeight) : scene.resize(window.innerWidth, window.innerHeight);
      const observer = box && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
      if (observer && box) observer.observe(box);
      else window.addEventListener('resize', onResize);
      onResize();
      if (controller.mission) camera.reset(v, live.state, controller.mission);

      const room = window.matchMedia(HINT_FITS);
      const onRoomChange = () => set({ hintFits: room.matches });
      room.addEventListener('change', onRoomChange);

      const unwire = wireDocument({
        store,
        onGesture: () => {
          if (!get().muted) unlockAudio();
          haptics.unlock();
          preferences.dismissHint();
        },
        onBackgrounded: (hidden) => void audio.setBackgrounded(hidden),
        emit: (e) => session.emit(e),
        zoom: (direction) => session.zoom(direction),
        readThrottle: () => live.state.vehicle.throttle,
        dismissDebrief: () => session.dismissDebrief(),
        isManual: () => !get().tiltControl || live.state.autopilot.manualControlOn,
      });

      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const frameTime = (now - last) / 1000;
        last = now;
        // advance hands out whole DT steps under the warp and pause; simulatedDt
        // is how much world actually went past, and everything below runs on it.
        const worldDt = session.advance(frameTime).simulatedDt;
        const s = live.state;
        scene.draw(s, live.previous, worldDt, get().preset, controller);

        audio.update(s);
        hud?.update(s);
        metrics?.update(s);
        timelineBinder?.update();
        indicators?.update(s);
        controlGroups?.update(s);
        hudGroups?.update(s);

        // The map is throttled rather than diffed; a folded map costs one read.
        if (mapSurface?.visible && mapRenderer && mapOptions) {
          mapOptions.scale = mapSurface.scale;
          if (mapSurface.dirty) {
            mapSurface.dirty = false;
            mapRenderer.redraw(s);
          } else {
            mapRenderer.update(s, worldDt);
          }
        }

      };
      frame = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener('resize', onResize);
        room.removeEventListener('change', onRoomChange);
        unwire();
        if (resetSceneForFlight === scene.resetFlight) resetSceneForFlight = undefined;
        presentationProbe.unbind(scene);
        scene.destroy();
        hud?.destroy();
        metrics?.destroy();
        timelineBinder?.destroy();
        indicators?.destroy();
        controlGroups?.destroy();
        hudGroups?.destroy();
        v.destroy();
        void audio.destroy();
      };
    },
  };
  return session;
}
