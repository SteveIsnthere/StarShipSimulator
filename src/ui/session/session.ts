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
import { advance, createLoopState, type LoopState } from '$app/loop';
import { installSimDebug } from '$app/debug';
import { applyControl, type ControlEvent } from '$app/controls';
import { fieldsToPreset, toLoopOptions, type EditorFields, type TimeSetting } from '$app/menu';
import {
  CAMERA_KEY,
  CINEMATIC_KEY,
  HINT_KEY,
  clearPreferences,
  readFlag,
  readItem,
  writeItem,
} from '$app/preferences';
import { vehicleHeight } from '$core/constants';
import { toggleRandomFailure } from '$core/control/commands';
import {
  createIntroState,
  createScenarioState,
  getScenario,
  type ScenarioPreset,
} from '$core/scenarios';
import type { SimState } from '$core/state';
import { createView, type ViewApp } from '$view/app';
import { CAMERA_MODES, modeZoom, type CameraMode } from '$view/camera';
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
import { createFlightWatch, debrief } from '$hud/debrief';
import { autopilotMode } from '$hud/autopilot-mode';
import {
  createMapRenderer,
  type MapRenderer,
  type MapRendererOptions,
  type MapSurface,
} from '$hud/trajectory-draw';
import { createRecorder, type Recorder } from '$app/recorder';
import {
  createAudioEngine,
  DEFAULT_VOLUME,
  readMuted,
  readVolume,
  type AudioEngine,
} from '$audio/engine';
import { createScene } from './scene';
import { createCameraFollow } from './camera-follow';
import { wireDocument } from './document-wiring';
import { createSessionStore, isHintOpen, isPaused, type Layer, type SessionStore } from './store';

/** Below this height there is no room for the first-flight hint (measured; see the hint's history). */
export const HINT_FITS = '(height >= 26rem)';

export interface Session {
  readonly store: SessionStore;
  /** The live flight. Read it; change it only through the commands. */
  readonly loop: LoopState;
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

function readCameraMode(): CameraMode {
  const stored = readItem(CAMERA_KEY) ?? '';
  return (CAMERA_MODES as readonly string[]).includes(stored) ? (stored as CameraMode) : 'follow';
}

function hasRoomForHint(): boolean {
  try {
    return window.matchMedia(HINT_FITS).matches;
  } catch {
    return true;
  }
}

export function createSession(): Session {
  const store = createSessionStore({
    cinematic: readFlag(CINEMATIC_KEY),
    cameraMode: readCameraMode(),
    muted: readMuted(),
    volume: readVolume(),
    // Storage blocked reads as unseen: two sentences once per visit is the right side to err on.
    hintSeen: readFlag(HINT_KEY),
    hintFits: hasRoomForHint(),
  });
  const set = store.setState;
  const get = store.getState;

  const timeline = createTimeline();
  const haptics = createHaptics(browserHost());
  const recorder = createRecorder();
  const previousRecorder = createRecorder();
  const watch = createFlightWatch();
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
  const loop: LoopState = createLoopState(createIntroState());
  let view: ViewApp | undefined;
  let hud: HudBinder | undefined;
  let metrics: MetricBinder | undefined;
  let indicators: IndicatorBinder | undefined;
  let timelineBinder: TimelineBinder | undefined;
  // A browser without Web Audio still flies, silently: an unlock that cannot
  // build a context is not an error worth surfacing.
  const unlockAudio = () => void audio.unlock().catch(() => {});

  let mapRenderer: MapRenderer | undefined;
  let mapSurface: MapSurface | null = null;
  let mapOptions: MapRendererOptions | undefined;
  let flightEnded = false;

  const camera = createCameraFollow();

  /**
   * Once per simulation step, not per frame: the recorder samples steps, and
   * the camera's second-order follow has to see every position the vehicle
   * occupied for its framing to be independent of the frame rate.
   */
  const onStep = (state: SimState) => {
    recorder.sample(state);
    watch.observe(state);
    if (!view) return;
    view.followAltitude(state.kinematics.altitude);
    camera.step(view, state);
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

  const startFlight = (preset: ScenarioPreset) => {
    timeline.reset();
    const fresh = createScenarioState(preset);
    fresh.failures.randomFailure = get().randomFailure;
    loop.state = fresh;
    loop.previous = fresh;
    loop.accumulator = 0;
    // Put the camera where the new flight is, moving as the vehicle moves:
    // from rest it can never catch a fast one.
    if (view) {
      view.followAltitude(fresh.kinematics.altitude);
      const cam = view.camera;
      cam.posX = fresh.kinematics.downRangeDistance;
      cam.posY = Math.max(view.viewport.physicalHeight * 0.5, fresh.kinematics.altitude);
      cam.speedX = fresh.kinematics.speedX;
      cam.speedY = fresh.kinematics.speedY;
      cam.accX = 0;
      cam.accY = 0;
    }
    // Keep this flight as the ghost before the recorder empties; skip an empty one.
    if (recorder.length > 0) previousRecorder.copyFrom(recorder);
    recorder.clear();
    audio.resetFlight();
    if (mapSurface) mapSurface.dirty = true;
    watch.reset();
    flightEnded = false;
    set({ preset, flightOver: false, debrief: null });
    syncAutopilot();
  };

  const dismissHint = () => {
    if (!isHintOpen(get())) return;
    writeItem(HINT_KEY, '1');
    set({ hintSeen: true });
  };

  const setVolume = (level: number, remember = true) => {
    audio.setVolume(level, { remember });
    // Read back: the engine clamps.
    set({ volume: audio.volume });
    if (remember && !get().muted) unlockAudio();
  };

  const session: Session = {
    store,
    loop,
    timeline,
    recorder,
    previousRecorder,

    bindHud(resolve, resolveMetric) {
      hud?.destroy();
      metrics?.destroy();
      hud = createHudBinder({ resolve });
      metrics = createMetricBinder({ resolve: resolveMetric });
    },
    bindIndicators(resolve) {
      indicators?.destroy();
      indicators = createIndicatorBinder({ resolve });
    },
    bindTimeline(track, resolve, text) {
      timelineBinder ??= createTimelineBinder({ timeline, resolveText: text });
      timelineBinder.rebind(track, resolve);
    },
    bindMap(surface) {
      mapSurface = surface;
      if (!surface) return; // a refused 2D context: everything else still flies
      mapOptions = {
        context: surface.context,
        trail: { downRange: recorder.series['downRange']!, altitude: recorder.series['altitude']! },
        scale: surface.scale,
        status: surface.status,
      };
      mapRenderer = createMapRenderer(mapOptions);
    },

    emit(event) {
      applyControl(loop.state, event);
      syncAutopilot();
    },
    startFlight,
    configure(fields) {
      startFlight(fieldsToPreset(fields, get().preset));
      set({ layer: null });
    },
    restart() {
      startFlight(get().preset);
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
    toggleCinematic() {
      const cinematic = !get().cinematic;
      writeItem(CINEMATIC_KEY, cinematic ? '1' : '0');
      set({ cinematic });
      applyCameraMode();
    },
    selectCameraMode(mode) {
      writeItem(CAMERA_KEY, mode);
      set({ cameraMode: mode });
      applyCameraMode();
    },
    toggleMuted() {
      const muted = !get().muted;
      void audio.setMuted(muted);
      if (!muted) unlockAudio(); // unmuting is a gesture
      set({ muted });
    },
    setVolume,
    setTime(time) {
      set({ time });
    },
    toggleRandomFailure() {
      toggleRandomFailure(loop.state);
      set({ randomFailure: loop.state.failures.randomFailure });
    },
    toggleTiltControl() {
      set({ tiltControl: !get().tiltControl });
    },
    /**
     * Every remembered preference back to a fresh profile's, taking effect now.
     * The hint returns too, so the menu closes: a hint nobody can see is not
     * restored. The map's fold resets itself on clearPreferences' event.
     */
    restoreDefaults() {
      void audio.setMuted(false);
      setVolume(DEFAULT_VOLUME);
      set({ muted: false, hintSeen: false, layer: null, cinematic: false, cameraMode: 'follow' });
      applyCameraMode();
      clearPreferences();
    },
    dismissHint,
    dismissDebrief() {
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
      installSimDebug(window, import.meta.env.DEV, {
        loop: () => loop,
        startScenario: (id, overrides) => {
          const preset = getScenario(id);
          if (!preset) throw new Error(`no scenario '${id}'`);
          startFlight({ ...preset, ...overrides });
        },
        setPaused: (debugPaused) => set({ debugPaused }),
        onStep,
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

      const room = window.matchMedia(HINT_FITS);
      const onRoomChange = () => set({ hintFits: room.matches });
      room.addEventListener('change', onRoomChange);

      const unwire = wireDocument({
        store,
        onGesture: () => {
          if (!get().muted) unlockAudio();
          haptics.unlock();
          dismissHint();
        },
        onBackgrounded: (hidden) => void audio.setBackgrounded(hidden),
        emit: (e) => session.emit(e),
        zoom: (direction) => session.zoom(direction),
        readThrottle: () => live.state.vehicle.throttle,
        isManual: () => !get().tiltControl || live.state.autopilot.manualControlOn,
      });

      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const frameTime = (now - last) / 1000;
        last = now;
        // advance hands out whole DT steps under the warp and pause; simulatedDt
        // is how much world actually went past, and everything below runs on it.
        const worldDt = advance(live, frameTime, loopOptions).simulatedDt;
        const s = live.state;
        scene.draw(s, live.previous, worldDt, get().preset);

        // The tracker first, so a dot and its narration agree within a frame;
        // one buzz per event that fired, under warp too.
        const before = timeline.events.length;
        timeline.observe(s);
        for (let i = before; i < timeline.events.length; i++) haptics.event(timeline.events[i]!.id);

        audio.update(s);
        hud?.update(s);
        metrics?.update(s);
        timelineBinder?.update();
        indicators?.update(s);

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

        // Store writes only on a change, so a steady flight writes nothing.
        syncAutopilot();
        const over = s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut;
        if (over !== get().flightOver) set({ flightOver: over });
        // The card waits for the ground or a break-up; running dry in the air is not an ending.
        const ended = s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp;
        if (ended !== flightEnded) {
          flightEnded = ended;
          set({ debrief: ended ? debrief(s, timeline, watch.last) : null });
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
        scene.destroy();
        hud?.destroy();
        metrics?.destroy();
        timelineBinder?.destroy();
        indicators?.destroy();
        v.destroy();
        void audio.destroy();
      };
    },
  };
  return session;
}
