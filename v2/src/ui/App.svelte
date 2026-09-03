<script lang="ts">
  import { onMount } from 'svelte';
  import { createView, type ViewApp } from '$view/app';
  import { CAMERA_MODES, modeZoom, updateCamera, worldToScreen, type CameraMode } from '$view/camera';
  import { starBaseXPos } from '$core/constants';
  import { loadTextures } from '$view/assets';
  import { createWorld } from '$view/world';
  import { createTerrainTextures } from '$view/terrain';
  import { createDistantEarth } from '$view/distant-earth';
  import { createFlightPathMarker } from '$view/motion-cues';
  import { createCloudDeck } from '$view/clouds';
  import { createAudioEngine, readMuted, type AudioEngine } from '$audio/engine';
  import { createVehicle } from '$view/vehicle';
  import { createParticleSystem, createParticleTextures } from '$view/particles';
  import { createEffectDriver } from '$view/effects';
  import { createSky } from '$view/sky';
  import { createSunLight, writeSun } from '$view/sun';
  import { createVehicleLighting } from '$view/lighting';
  import { createOnboardInset, createSheath, windwardInHull } from '$view/reentry';
  import { plasmaIntensity } from '$view/atmosphere-look';
  import { STARSHIP_TEXTURE } from '$view/assets';
  import { bloomIntensity, createPostPass, heatIntensity } from '$view/post';
  import { heatLimit } from '$core/constants';
  import { createIntroState, createScenarioState, INTRO, type ScenarioPreset } from '$core/scenarios';
  import { advance, createLoopState, DT, type LoopState } from '$app/loop';
  import { vehicleHeight } from '$core/constants';
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
  import Broadcast from './Broadcast.svelte';
  import {
    createMapRenderer,
    type MapRenderer,
    type MapRendererOptions,
    type MapSurface,
  } from '$hud/trajectory-draw';
  import { createTimeline } from '$hud/timeline';
  import { browserHost, createHaptics } from '$hud/haptics';
  import { createTimelineBinder, type TimelineBinder } from '$hud/timeline-binder';
  import type { EventId } from '$hud/timeline';
  import Controls from './Controls.svelte';
  import { applyControl, type ControlEvent } from './controls';
  import { bindInput, bindTilt, type InputBinding, type ViewAction } from '$app/input';
  import Menu from './Menu.svelte';
  import {
    fieldsToPreset,
    REAL_TIME,
    toLoopOptions,
    type EditorFields,
    type TimeSetting,
  } from './menu';
  import { toggleRandomFailure } from '$core/control/commands';
  import BlackBox from './BlackBox.svelte';
  import Debrief from './Debrief.svelte';
  import { createFlightWatch, debrief, type Debrief as DebriefCard } from '$hud/debrief';
  import { createRecorder } from '$app/recorder';
  import InfoView from './InfoView.svelte';

  let canvas: HTMLCanvasElement;

  /**
   * The one HUD binder. Created when Hud.svelte reports its elements, which
   * may be before or after the async view start finishes — the tick reads it
   * through this binding rather than closing over it, so neither order breaks.
   */
  let hud: HudBinder | undefined;

  /**
   * The third binder, added in M6.2: the parts of the overlay that are drawn
   * rather than spelled — gauge arcs, propellant bars, engine dots, the
   * attitude chevron. Same law as the other two: resolved once, diffed before
   * writing, driven from the one rAF subscriber below.
   */
  let metrics: MetricBinder | undefined;

  /**
   * The mission event tracker, and the binder that draws it.
   *
   * The tracker is created once and RESET per flight rather than recreated,
   * because the binder holds a reference to it — handing the binder a new
   * object on every Configure would leave it reporting a timeline nobody is
   * feeding. See hud/timeline.ts for why it has memory at all.
   */
  const timeline = createTimeline();

  /**
   * The phone's other output (M12.4).
   *
   * Built once from the platform, unlocked by the same gesture that unlocks the
   * audio — both are gated on user activation and both are things a page must
   * not do to someone who has not touched it yet.
   */
  const haptics = createHaptics(browserHost());
  let timelineBinder: TimelineBinder | undefined;

  const onTimelineReady = (
    track: readonly EventId[],
    resolve: (id: string) => AttributeTarget | null,
    text: (id: 'now' | 'next') => TextTarget | null,
  ) => {
    timelineBinder ??= createTimelineBinder({ timeline, resolveText: text });
    timelineBinder.rebind(track, resolve);
  };

  const onBroadcastReady = (
    resolve: (id: string) => { value: TextTarget | null; unit: TextTarget | null },
    resolveMetric: (id: string) => AttributeTarget | null,
  ) => {
    hud = createHudBinder({ resolve });
    metrics = createMetricBinder({ resolve: resolveMetric });
  };

  /** The same discipline for the controls: diffed booleans, one class toggle. */
  let indicators: IndicatorBinder | undefined;

  const onControlsReady = (resolve: (id: string) => ClassTarget | null) => {
    indicators = createIndicatorBinder({ resolve });
  };

  /**
   * The loop, held so control events can reach it.
   *
   * Events are applied to the live state immediately rather than queued for the
   * next step: a button press is not a physics quantity and does not need to
   * wait for a tick boundary, and `step()` reads SimState rather than any input
   * buffer, so applying between steps is exactly as deterministic.
   */
  let loopState: LoopState | undefined;

  const emit = (event: ControlEvent) => {
    if (loopState) applyControl(loopState.state, event);
  };

  /**
   * Menu state.
   *
   * All three are reactive because the menu is interaction-driven: it renders
   * when one of them changes, which is never during flight. `menuOpen` also
   * gates the keyboard, as eventListener.js:3 did — typing an altitude into the
   * editor must not fire the engines.
   */
  let menuOpen = $state(false);
  let blackBoxOpen = $state(false);
  let infoView = $state<'guide' | 'about' | null>(null);

  /**
   * Cinematic mode: hide the flight-controls layer.
   *
   * The one deliberate departure from the reference, made reversible.
   * BROADCAST-UI-PLAN § 1 is blunt about it — SpaceX never shows a button
   * because a broadcast viewer cannot press anything, and this is a cockpit. So
   * the controls exist, in the same visual language, as a second layer; turning
   * that layer off leaves exactly the broadcast.
   *
   * Defaults OFF (it is a cockpit first) and is remembered per device. Reading
   * localStorage is wrapped because a browser with site data blocked THROWS on
   * access rather than returning null, and a simulator that will not start
   * because it could not remember a preference would be a poor trade.
   */
  const CINEMATIC_KEY = 'starship:cinematic';

  const readCinematic = (): boolean => {
    try {
      return localStorage.getItem(CINEMATIC_KEY) === '1';
    } catch {
      return false;
    }
  };

  let cinematic = $state(readCinematic());

  /**
   * The camera mode (M11.6): the director's choice, and so a CINEMATIC one.
   * With the controls showing this is a cockpit and the camera is the cockpit's;
   * with them hidden the selector appears and the chosen mode drives the lens.
   * Remembered per device through the same guarded read the cinematic flag
   * uses, for the same reason.
   */
  const CAMERA_KEY = 'starship:camera';
  const isCameraMode = (v: unknown): v is CameraMode =>
    typeof v === 'string' && (CAMERA_MODES as readonly string[]).includes(v);
  const readCameraMode = (): CameraMode => {
    try {
      const stored = localStorage.getItem(CAMERA_KEY);
      return isCameraMode(stored) ? stored : 'follow';
    } catch {
      return 'follow';
    }
  };
  let cameraMode = $state<CameraMode>(readCameraMode());
  /** What the lens actually does: the chosen mode in cinematic, the cockpit's otherwise. */
  const applyCameraMode = () => {
    const effective: CameraMode = cinematic ? cameraMode : 'follow';
    cameraOptions.mode = effective;
    viewApp?.setModeZoom(modeZoom(effective));
  };
  const selectCameraMode = (mode: CameraMode) => {
    cameraMode = mode;
    try {
      localStorage.setItem(CAMERA_KEY, mode);
    } catch {
      // A browser that refuses site data still gets the mode for this visit.
    }
    applyCameraMode();
  };
  const CAMERA_LABELS: Record<CameraMode, string> = {
    follow: 'Follow',
    pad: 'Pad',
    chase: 'Chase',
    onboard: 'Onboard',
  };

  const toggleCinematic = () => {
    cinematic = !cinematic;
    applyCameraMode();
    try {
      localStorage.setItem(CINEMATIC_KEY, cinematic ? '1' : '0');
    } catch {
      // Nothing to do and nothing worth saying: the mode still works for this
      // session, it just will not be remembered.
    }
  };

  /**
   * Sound (M8.1).
   *
   * Created eagerly but CONSTRUCTS NOTHING until the first gesture: browsers
   * refuse audio before one, and the intro demo plays before the player has
   * touched anything. SOUND-PLAN § 3.4 argues the resulting silence is correct
   * rather than a compromise — sound arriving as you take control is a better
   * moment than sound that fights the autoplay policy and loses.
   */
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

  let muted = $state(readMuted());

  const toggleMuted = () => {
    muted = !muted;
    void audio.setMuted(muted);
    // Unmuting IS a gesture, so it is also the moment audio may start.
    if (!muted) void audio.unlock();
  };

  /**
   * The flight recorder.
   *
   * Held outside SimState on purpose: the history is unbounded and SimState is
   * cloned every step, so growing arrays inside it would make each step cost
   * O(flight length) and would put the whole recording into every golden
   * fixture. See app/recorder.ts.
   */
  const recorder = createRecorder();

  /**
   * The flight before this one, kept for the black box's ghost (M12.3).
   *
   * A SECOND RECORDER, filled by copying at restart rather than by sampling
   * twice. `recorder.clear()` truncates its arrays in place — the trajectory
   * map holds references to them (M7.1) and a fresh object would strand the
   * map on the old flight — so "keep the previous one" cannot mean "keep the
   * previous object". It means copy the numbers out before the truncation.
   *
   * One flight back, not a history: two lines on a plot is a comparison and
   * five is a smear.
   */
  const previousRecorder = createRecorder();

  /**
   * What happens once per SIMULATION STEP, not once per frame.
   *
   * Two things live here, for the same reason.
   *
   * THE RECORDER, since M4.5. Its rule is "every fifth frame" in 2021's sense,
   * where a frame WAS a step. A frame here runs however many steps the
   * accumulator drained, so sampling once per frame would skip most sampling
   * points and record a different flight at a different frame rate.
   *
   * THE CAMERA, since M9.2, and it is the same argument one layer out. The
   * camera is a second-order follow: where it ends up depends on the PATH its
   * target took, not only on where that target finished. Advanced once per
   * frame it sees the vehicle teleport — 1.1 km at a time during a 9x re-entry,
   * two thirds of a frame width — and it can only ever chase an endpoint,
   * so it lags by an amount that depends on the frame rate and the warp factor.
   * Advanced once per step it sees every position the vehicle actually occupied,
   * at a dt that is always exactly DT.
   *
   * The difference is not marginal. Measured over all seven goldens, at 60 fps
   * and at 9x warp, with and without a 400 ms stall every two seconds, the worst
   * offset of the vehicle from frame centre is now THE SAME NUMBER in all five
   * configurations — 30% of a half-frame on `reentry`, 26% on `rtls`, 1% on the
   * intro. Per frame it ranged from 30% to 1218%. Frame-rate independence
   * (M7.3's property 3) stops being a tolerance and becomes an identity.
   *
   * A stable function, so passing it costs no allocation.
   */
  const onStep = (state: import('$core/state').SimState) => {
    recorder.sample(state);
    watch.observe(state);

    const view = viewApp;
    if (!view) return;

    /*
      The field of view follows altitude before the camera moves inside it
      (M7.3). Order matters: the follow law's thresholds are fractions of the
      viewport, so updating the camera against last step's viewport would aim it
      using a frame that no longer exists.
    */
    view.followAltitude(state.kinematics.altitude);

    cameraTarget.downRangeDistance = state.kinematics.downRangeDistance;
    cameraTarget.altitude = state.kinematics.altitude;
    cameraTarget.speedX = state.kinematics.speedX;
    cameraTarget.speedY = state.kinematics.speedY;
    cameraTarget.landed = state.status.landed;
    cameraTarget.onTheGround = state.status.onTheGround;
    cameraTarget.crashed = state.failures.crashed;
    cameraTarget.dynamicPressure = state.forces.dynamicPressure;
    cameraTarget.thrustAcceleration = state.forces.thrustAcceleration;
    updateCamera(view.camera, cameraTarget, view.viewport, DT, cameraOptions);
  };

  /**
   * The trajectory map (M7.1).
   *
   * Its trail is the flight recorder's, read rather than copied: the recorder
   * is already sampling downrange and altitude for the black box, and keeping a
   * second history of the same two numbers would be a second thing to keep in
   * step. The arrays it hands out are stable across `clear()` — which truncates
   * rather than replaces — so this reference survives a restart, and a restart
   * empties the map's trail for free.
   */
  let mapRenderer: MapRenderer | undefined;
  let mapSurface: MapSurface | null = null;
  let mapOptions: MapRendererOptions | undefined;

  const onMapReady = (surface: MapSurface | null) => {
    mapSurface = surface;
    // Null means the browser refused a 2D context. Everything else still flies.
    if (!surface) return;
    mapOptions = {
      context: surface.context,
      trail: { downRange: recorder.series['downRange']!, altitude: recorder.series['altitude']! },
      scale: surface.scale,
      status: surface.status,
    };
    mapRenderer = createMapRenderer(mapOptions);
  };

  let time = $state<TimeSetting>(REAL_TIME);
  let randomFailure = $state(false);
  /** eventListener.js:117 — on by default, as 2021 had it. */
  let tiltControl = $state(true);
  /**
   * The end-of-flight restart. dispUpdate.js:47 revealed a button when the
   * flight ended; here the same condition drives it.
   */
  let flightOver = $state(false);

  /**
   * The debrief (M12.1).
   *
   * `watch` runs beside the recorder in `onStep`, at STEP rate rather than
   * frame rate, and that is not a preference. It keeps the last airborne
   * instant, and `checkIfCrash` erases the speeds and the pitch it judged in
   * the same step it judges them — so a witness sampled once a frame would be
   * up to a whole frame stale, which on a loaded machine is a quarter of a
   * second of free fall and two and a half metres per second of the number the
   * card exists to show.
   */
  const watch = createFlightWatch();
  let debriefCard = $state<DebriefCard | null>(null);
  /** Ended, in the sense the CARD means: the vehicle is down or gone. */
  let flightEnded = false;

  /** Recomputed only when the time setting changes, never per frame. */
  const loopOptions = $derived({ ...toLoopOptions(time), onStep });

  /** What the current flight was configured from, so a partial edit has a base. */
  // $state because the black box reads it for the export's file name (M12.3),
  // and a plain `let` read in the template never updates when a new flight is
  // configured — svelte-check says so, which is how this was found.
  let currentPreset = $state<ScenarioPreset>(INTRO);

  /**
   * The scenario name, shown beside the clock on the upper scrim.
   *
   * Reactive, and safe to be: it changes when a flight is configured and at no
   * other time, so it renders on interaction like everything else Svelte owns
   * here. The name itself is the preset's — `Configure` on a hand-edited flight
   * keeps the base preset's name, which is what the editor means by editing it.
   */
  let scenarioName = $state(INTRO.name);
  /** The preset's id, which selects the expected event track. */
  let scenarioId = $state(INTRO.id);

  const onToggleRandomFailure = () => {
    if (!loopState) return;
    toggleRandomFailure(loopState.state);
    randomFailure = loopState.state.failures.randomFailure;
  };

  /**
   * tools.js:188 — configure and fly a new flight.
   *
   * A restart replaces the state rather than editing the live one: the 2021
   * version assigned to a dozen globals and left everything else — engine
   * states, autopilot latches, RNG counters — exactly as the previous flight
   * had left it, which is why a configured flight sometimes started with an
   * autopilot stage half-completed.
   */
  const onConfigure = (fields: EditorFields) => {
    if (!loopState) return;
    startFlight(fieldsToPreset(fields, currentPreset));
    menuOpen = false;
  };

  /**
   * tools.js:70 — restart the flight that is loaded.
   *
   * Shares its implementation with Configure, because they are the same
   * operation: build a fresh state from the current preset. 2021 had two
   * separate paths and they disagreed — `restart()` re-ran initBackEnd() while
   * `configureNewFlight()` assigned over the live globals.
   */
  const startFlight = (preset: ScenarioPreset) => {
    if (!loopState) return;
    currentPreset = preset;
    scenarioName = preset.name;
    scenarioId = preset.id;
    // A new flight is a new story. Reset rather than replace — see above.
    timeline.reset();
    const fresh = createScenarioState(preset);
    fresh.failures.randomFailure = randomFailure;
    loopState.state = fresh;
    loopState.previous = fresh;
    loopState.accumulator = 0;
    /*
      Put the camera where the new flight is.

      A pre-existing bug, found by M7.4's 20 km screenshot showing an empty sky:
      `Configure` replaced the simulation but left the camera wherever the last
      flight had ended, and `centerizeAcceleration` deliberately gives up beyond
      half a viewport — so a flight configured at 20 km was permanently off
      screen with no way to recover. Seeded exactly as `createCamera` seeds it,
      velocity included, for the reason M7.3's framing test learned the hard
      way: from rest the camera can never catch a fast vehicle.
    */
    if (viewApp) {
      viewApp.followAltitude(fresh.kinematics.altitude);
      const cam = viewApp.camera;
      cam.posX = fresh.kinematics.downRangeDistance;
      cam.posY = Math.max(viewApp.viewport.physicalHeight * 0.5, fresh.kinematics.altitude);
      cam.speedX = fresh.kinematics.speedX;
      cam.speedY = fresh.kinematics.speedY;
      cam.accX = 0;
      cam.accY = 0;
    }

    /*
      Copy this flight into the ghost, then start the next one. Skipped when
      there is nothing to copy, so the first flight of a session does not
      overwrite the ghost with an empty recording and hide the one before it.
    */
    if (recorder.length > 0) previousRecorder.copyFrom(recorder);

    recorder.clear();
    // A new flight re-arms the transient latches: the same flight flown again
    // deserves to have its touchdown heard again (M8.4).
    audio.resetFlight();

    // The map's trail IS the recorder's, so it has just emptied. Redraw now
    // rather than leaving the previous flight's path on screen for the tenth of
    // a second the throttle would otherwise take.
    if (mapSurface) mapSurface.dirty = true;
    flightOver = false;
    watch.reset();
    debriefCard = null;
    flightEnded = false;
  };

  const onRestart = () => startFlight(currentPreset);

  /**
   * The camera's view of the vehicle, allocated ONCE and refilled per frame.
   *
   * It used to be an object literal inside the tick — which allocated a fresh
   * one sixty times a second for the whole life of the page, against a budget
   * that says zero. It was two fields then; M7.3 makes it nine, which is what
   * made the cost worth removing rather than tolerating.
   */
  const cameraTarget = {
    downRangeDistance: 0,
    altitude: 0,
    speedX: 0,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
    dynamicPressure: 0,
    thrustAcceleration: 0,
  };

  /**
   * Read once, at startup: a player who has asked not to be shaken has asked
   * once. Held in a stable object so passing it costs no allocation.
   */
  const cameraOptions: { reducedMotion: boolean; mode: CameraMode; padX: number } = {
    reducedMotion:
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    mode: 'follow',
    // The pad camera stands on the pad.
    padX: starBaseXPos,
  };

  /** Zoom is a view action, not a simulation command — it changes nothing. */
  let viewApp: ViewApp | undefined;
  const zoom = (direction: 1 | -1) => viewApp?.zoom(direction);
  const applyViewAction = (action: ViewAction) => zoom(action.direction);

  onMount(() => {
    let view: ViewApp | undefined;
    let frame = 0;
    let disposed = false;

    const start = async () => {
      const initial = createIntroState();
      const loop = createLoopState(initial);
      loopState = loop;

      view = await createView({
        canvas,
        vehicleHeight,
        downRangeDistance: initial.kinematics.downRangeDistance,
        speedY: initial.kinematics.speedY,
      });
      if (disposed) {
        view.destroy();
        return;
      }

      viewApp = view;

      applyCameraMode();

      const textures = await loadTextures();
      if (disposed) {
        view.destroy();
        return;
      }
      /*
        The generated terrain (M9.8): a tileable mottle and a vertical ramp,
        shared by the near ground and the far earth so the two surfaces cannot
        become two different materials. Built before either, because both are
        constructed with it.
      */
      const terrain = createTerrainTextures();
      const world = createWorld(textures, terrain);
      /*
        The sun (M11.4): one object, written once a frame from the scenario,
        the clock and the longitude, and read by everything below that has a
        colour. The vehicle's normal map is generated from its sprite here,
        at mount, and lit by the same object.
      */
      const sun = createSunLight();
      // Preallocated, like the sun: the world reads it every frame.
      const worldLighting = { sun, downRangeDistance: 0, altitude: 0, pitch: 0 };
      const hullTexture = textures.get(STARSHIP_TEXTURE);
      const lighting = hullTexture ? createVehicleLighting(hullTexture) : undefined;
      const vehicle = createVehicle(textures, lighting);
      /*
        Re-entry (M11.5): the plasma sheath wraps the hull in the main view,
        and the onboard inset shows the same vehicle large while it is hot.
        Both read `thermalPower` against the limit and the angle of attack.
      */
      const sheath = createSheath();
      vehicle.container.addChild(sheath.mesh);
      const inset = createOnboardInset(textures, lighting);
      const windward = { x: 0, y: 1 };
      // Preallocated: the inset reads it every frame.
      const insetState = {
        altitude: 0,
        downRangeDistance: 0,
        pitch: 0,
        angleOfAttack: 0,
        frontFinExtension: 0,
        aftFinExtension: 0,
      };
      /*
        The distant earth goes in the FAR layer, behind the true ground (M7.4).
        Order is the whole trick: below the follow ratio the two lines coincide
        exactly, so this one is completely hidden behind the real one and the
        handover has nothing to see.
      */
      /*
        One atlas, two consumers (M9.7). The particle pool draws its four frames
        from it, and the cloud deck draws its puffs from the `wisp` frame — which
        is not a shortcut: a cumulus edge and a shed vortex are the same shape
        problem, feathered and elongated, and generating a second texture for the
        second one would be two things to keep in step for no gain. Built here,
        before either consumer, because the deck is constructed with it.
      */
      const particleTextures = createParticleTextures(view.app.renderer);

      const distantEarth = createDistantEarth(terrain);
      view.layers.far.addChild(distantEarth.container);
      /*
        The cloud deck goes in FRONT of the distant earth and behind the true
        ground (M7.6). That order is the depth: three layers moving at three
        rates is what the game had none of — the parallax used to jump from 1x
        straight to the stars.
      */
      const clouds = createCloudDeck(particleTextures.wisp);
      view.layers.far.addChild(clouds.container);
      view.layers.world.addChild(world.container);
      view.layers.vehicle.addChild(vehicle.container);

      const sky = createSky(view.app.renderer);
      view.layers.sky.addChild(sky.container);

      const particles = createParticleSystem(particleTextures);
      const effects = createEffectDriver();
      view.layers.effectsBehind.addChild(particles.container);

      /*
        The flight-path marker (M7.5), in front of everything: it is an
        instrument, and an instrument the plume can draw over is not one.
      */
      const flightPath = createFlightPathMarker();
      view.layers.effectsFront.addChild(flightPath.container);
      // The inset over everything: it is a window, not a thing in the world.
      view.layers.effectsFront.addChild(inset.container);

      const post = createPostPass(
        view.layers.effectsBehind,
        view.layers.vehicle,
        view.viewport.width,
        view.viewport.height,
      );
      let elapsed = 0;

      const onResize = () => {
        view?.resize(window.innerWidth, window.innerHeight);
        if (view) sky.resize(view.viewport);
      };
      window.addEventListener('resize', onResize);
      onResize();

      // Input is bound once, at startup, to the document. Every key turns into
      // the same ControlEvent a button would emit — there is no second path into
      // the simulation, which is what 2021's eventListener.js was.
      /*
        Every interaction is an unlock attempt. `unlock` is cheap after the
        first one — it builds the graph once and then only resumes a context
        that is usually already running — and being told twice is exactly what
        the autoplay policy expects. Attached in the capture phase so a click on
        a control counts, not only a click on bare background.
      */
      const onGesture = () => {
        if (!muted) void audio.unlock();
        haptics.unlock();
      };
      document.addEventListener('pointerdown', onGesture, { capture: true });
      document.addEventListener('keydown', onGesture, { capture: true });

      /*
        THE DEBRIEF GETS OUT OF THE WAY (M12.1).

        The card is a summary, not a dialog: it has no scrim and it does not
        take the flight away. But it is a large fixed panel over the middle of
        the screen, and the first full browser run said what that costs —
        `all-raptors`, `camera-onboard` and the old `restart` button all
        reported "<div data-testid=\"debrief\"> intercepts pointer events". A
        player who wants to fly rather than read should not have to find a Close
        button first.

        So the first touch anywhere else dismisses it, in the CAPTURE phase and
        without preventing anything: the control underneath receives the same
        gesture, so pressing a Raptor both clears the card and lights the
        engine. Escape does it too, which is what a dialog-shaped thing owes the
        keyboard even when it does not trap focus.
      */
      const dismissDebrief = (event: Event) => {
        if (debriefCard === null) return;
        /*
          Not while another panel is open. The card's own Black Box button opens
          a full-screen view over it, and closing that view is a click outside
          the card — so without this, going to the plots and coming back lost
          the summary you went there to compare against. The same three panels
          that block the flight controls block this: reading is not flying.
        */
        if (menuOpen || blackBoxOpen || infoView !== null) return;
        const target = event.target;
        if (target instanceof Node && (event.currentTarget as Document).contains(target)) {
          const card = (target as Element).closest?.('[data-debrief]');
          if (card) return;
        }
        debriefCard = null;
      };
      const onDebriefKey = (event: KeyboardEvent) => {
        if (debriefCard === null) return;
        if (event.key === 'Escape') debriefCard = null;
        else dismissDebrief(event);
      };
      document.addEventListener('pointerdown', dismissDebrief, { capture: true });
      document.addEventListener('keydown', onDebriefKey, { capture: true });

      /*
        The tab going away (M8.5). A phone that locks, navigates away or takes a
        call must not keep a rocket running in someone's pocket — and this is
        also what handles the interruption case, because an interrupted context
        comes back suspended and would otherwise never be resumed.
      */
      const onVisibility = () => void audio.setBackgrounded(document.hidden);
      document.addEventListener('visibilitychange', onVisibility);

      const keyboard: InputBinding = bindInput(document, {
        control: emit,
        view: applyViewAction,
        readThrottle: () => loop.state.vehicle.throttle,
        isBlocked: () => menuOpen || blackBoxOpen || infoView !== null,
      });

      // Tilt yields to a hand on the yoke, and is only meaningful on a device
      // that reports orientation at all.
      const tilt: InputBinding = bindTilt(window, {
        control: emit,
        // Off means off: the menu switch and a hand on the yoke both suppress it.
        isManual: () => !tiltControl || loop.state.autopilot.manualControlOn,
        orientationAngle: () => screen.orientation?.angle ?? 0,
      });

      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const frameTime = (now - last) / 1000;
        last = now;

        /*
          `loopOptions` is derived, so this allocates only when the time-warp
          setting changes — not on every frame, which the budget forbids.

          THE RETURN VALUE IS THE POINT (M9.2). `advance` does not simulate
          `frameTime` seconds: it clamps at MAX_FRAME_TIME, hands out only whole
          DT steps, divides by the slow-motion factor, multiplies by the warp
          factor and bails out at MAX_STEPS_PER_FRAME. `simulatedDt` is how much
          world actually went past, and it is what every consumer below is
          driven by. This line used to discard the result and pass `frameTime`
          to all of them, which on `reentry` put the vehicle 1734 px off the
          left edge of a 1280 px frame within four seconds and left it there.
        */
        const advanced = advance(loop, frameTime, loopOptions);
        const worldDt = advanced.simulatedDt;

        const s = loop.state;

        // The camera has already moved, once per step, inside `onStep`. By here
        // the viewport is set for `s`'s altitude and the lens is where it
        // belongs, which is why neither appears in this function any more.
        // Where the sun is this frame: the scenario's hour, advanced by the
        // clock and shifted by the longitude. Read-only over SimState.
        writeSun(
          sun,
          currentPreset.basedOn ?? currentPreset.id,
          s.world.environmentTime,
          s.kinematics.downRangeDistance,
          // A typed hour wins over the scenario's default (M12.2). Undefined
          // when the box is empty, which is what `LAUNCH_HOURS` is for.
          currentPreset.launchHour,
        );
        worldLighting.downRangeDistance = s.kinematics.downRangeDistance;
        worldLighting.altitude = s.kinematics.altitude;
        worldLighting.pitch = s.kinematics.pitch;

        sky.update(view!.camera, view!.viewport, s.kinematics.altitude, sun);
        distantEarth.update(view!.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
        clouds.update(view!.viewport, s.kinematics.altitude, s.kinematics.speedX, worldDt, sun);
        world.update(
          view!.camera,
          view!.viewport,
          s.kinematics.speedX,
          s.kinematics.altitude,
          worldLighting,
        );
        vehicle.update(
          view!.camera,
          view!.viewport,
          {
            altitude: s.kinematics.altitude,
            downRangeDistance: s.kinematics.downRangeDistance,
            pitch: s.kinematics.pitch,
            frontFinExtension: s.vehicle.frontFinExtension,
            aftFinExtension: s.vehicle.aftFinExtension,
          },
          sun,
        );

        effects.update(particles, view!.camera, view!.viewport, s, loop.previous, worldDt);

        {
          // The sheath and the inset (M11.5), from the same strength the
          // plasma trail and the HEAT readout share.
          const strength = plasmaIntensity(s.forces.thermalPower, heatLimit);
          windwardInHull(s.kinematics.angleOfAttack, windward);
          sheath.place(vehicleHeight * view!.viewport.scale);
          sheath.set(strength, windward.x, windward.y, elapsed);
          insetState.altitude = s.kinematics.altitude;
          insetState.downRangeDistance = s.kinematics.downRangeDistance;
          insetState.pitch = s.kinematics.pitch;
          insetState.angleOfAttack = s.kinematics.angleOfAttack;
          insetState.frontFinExtension = s.vehicle.frontFinExtension;
          insetState.aftFinExtension = s.vehicle.aftFinExtension;
          inset.update(view!.viewport, insetState, strength, sun, elapsed);
        }

        {
          // Where the vehicle is going, as against where its nose points. The
          // ship is drawn at its PITCH; at high angle of attack those differ
          // enormously and nothing on screen has ever said so.
          const at = worldToScreen(
            view!.camera,
            view!.viewport,
            s.kinematics.downRangeDistance,
            s.kinematics.altitude,
          );
          flightPath.update(
            at.x,
            at.y,
            s.kinematics.angleOfMotion,
            s.kinematics.trueSpeed,
            view!.viewport.height,
          );
        }

        elapsed += worldDt;
        const nose = worldToScreen(
          view!.camera,
          view!.viewport,
          s.kinematics.downRangeDistance,
          s.kinematics.altitude,
        );
        post.update(
          bloomIntensity(s.engines.running.filter(Boolean).length, s.vehicle.throttleCurrent),
          heatIntensity(s.forces.thermalPower, heatLimit),
          { x: nose.x / view!.viewport.width, y: nose.y / view!.viewport.height },
          elapsed,
        );

        // The single per-frame DOM subscriber. It diffs; most frames write nothing.
        // The tracker sees the state before the binders report it, so a dot
        // and the narration beside it can never disagree within a frame.
        const before = timeline.events.length;
        timeline.observe(s);
        /*
          One buzz per event, from the transition rather than from a state
          (M12.4). `observe` appends at most one event per step and never
          removes, so a length that grew is an event that just fired — the same
          reasoning the timeline binder uses to know what to light.
        */
        // EVERY new one, not just the last. `observe` can fire more than one
        // event in a call, and the loop runs many steps per frame under time
        // warp — the first version buzzed once for a frame in which three
        // things happened.
        for (let i = before; i < timeline.events.length; i++) {
          haptics.event(timeline.events[i]!.id);
        }

        // Sound, from the same tick and under the same law: diffed before
        // writing, and costing one comparison while muted or before the first
        // gesture (M8.2).
        audio.update(s);

        hud?.update(s);
        metrics?.update(s);
        timelineBinder?.update();
        indicators?.update(s);

        // The map, from the same tick and under the same law — except that it
        // is THROTTLED rather than diffed, because a canvas has no equivalent
        // of "this text node already says 42". A collapsed map costs one
        // property read.
        if (mapSurface?.visible && mapRenderer && mapOptions) {
          mapOptions.scale = mapSurface.scale;
          if (mapSurface.dirty) {
            mapSurface.dirty = false;
            mapRenderer.redraw(s);
          } else {
            mapRenderer.update(s, worldDt);
          }
        }

        // dispUpdate.js:47 — the same four conditions that revealed the restart
        // button. Assigning an unchanged boolean does not schedule a Svelte
        // update, so this costs nothing on the frames where it has not changed.
        const over =
          s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut;
        if (over !== flightOver) flightOver = over;

        /*
          The card, built once on the transition — not per frame.

          A different condition from `over`, deliberately: running out of
          propellant ends the flight for the Restart button's purposes, but the
          vehicle is still in the air and has no touchdown to report. The card
          waits for the ground or the break-up.
        */
        const ended = s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp;
        if (ended !== flightEnded) {
          flightEnded = ended;
          debriefCard = ended ? debrief(s, timeline, watch.last) : null;
        }
      };
      frame = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('pointerdown', onGesture, { capture: true });
        document.removeEventListener('keydown', onGesture, { capture: true });
        document.removeEventListener('pointerdown', dismissDebrief, { capture: true });
        document.removeEventListener('keydown', onDebriefKey, { capture: true });
        document.removeEventListener('visibilitychange', onVisibility);
        keyboard.destroy();
        tilt.destroy();
        // The hull shader and its generated normal map: Mesh.destroy nulls
        // its shader reference and no more, so these are released here.
        sheath.destroy();
        inset.destroy();
        lighting?.destroy();
      };
    };

    const cleanup = start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      void cleanup.then((fn) => fn?.());
      hud?.destroy();
      metrics?.destroy();
      timelineBinder?.destroy();
      indicators?.destroy();
      view?.destroy();
      void audio.destroy();
    };
  });
</script>

<!--
  The world. Named, because it is no longer the only canvas in the document:
  M7.1's trajectory map brought a second one, and every spec that said
  `locator('canvas')` was silently relying on there being exactly one. Naming it
  is the M6.1 rule applied a milestone late — address a thing by what it is, not
  by what tag it happens to be.
-->
<canvas bind:this={canvas} data-testid="world-canvas" aria-label="Starship Simulator"></canvas>
{#snippet topRight()}
  <!--
    The top-right buttons, and since M12.4 they are a CHILD of the clock's row
    rather than a box positioned over it.

    They already lived in one flex row among themselves — they were absolutely
    positioned with hand-picked offsets once, and the wider label overlapped its
    neighbour and swallowed its clicks, which an e2e caught. The same reasoning
    one level up is what this snippet is: the clock and these buttons share a
    row now, and things in one row cannot collide. On a phone they did, and the
    proof sat in `docs/screenshot-phone.png` for two milestones.
  -->
  <div class="top-right">

  <button
    class="top-button"
    class:is-on={cinematic}
    type="button"
    data-testid="cinematic-toggle"
    aria-pressed={cinematic}
    aria-label={cinematic ? 'Show flight controls' : 'Hide flight controls'}
    onclick={toggleCinematic}
  >
    <span class="pip" aria-hidden="true"></span>
    Cinematic
  </button>
  {#if cinematic}
    <!--
      The camera selector (M11.6), the one thing CINEMATIC adds rather than
      hides. Its own row under the buttons: four more in the same row would
      not fit a phone.
    -->
    <div class="camera-modes" role="group" aria-label="Camera" data-testid="camera-modes">
      {#each CAMERA_MODES as mode (mode)}
        <button
          class="top-button"
          class:is-on={cameraMode === mode}
          type="button"
          data-testid={`camera-${mode}`}
          aria-pressed={cameraMode === mode}
          onclick={() => selectCameraMode(mode)}
        >
          <span class="pip" aria-hidden="true"></span>
          {CAMERA_LABELS[mode]}
        </button>
      {/each}
    </div>
  {/if}
  <button
    class="top-button"
    class:is-on={!muted}
    type="button"
    data-testid="mute-toggle"
    aria-pressed={!muted}
    aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
    onclick={toggleMuted}
  >
    <span class="pip" aria-hidden="true"></span>
    Sound
  </button>
  <button class="top-button" type="button" data-blackbox-control="open" data-testid="open-black-box" onclick={() => (blackBoxOpen = true)}>
    Black Box
  </button>
  <button class="top-button" type="button" data-menu-control="open" data-testid="open-menu" onclick={() => (menuOpen = true)}>
    Menu
  </button>
</div>
{/snippet}

<Broadcast
  onready={onBroadcastReady}
  scenario={scenarioName}
  {scenarioId}
  ontimeline={onTimelineReady}
  onmap={onMapReady}
  {topRight}
/>
<Controls {emit} {zoom} onready={onControlsReady} hidden={cinematic} />

<!--
  The standalone Restart, and why it is now conditional on the card being gone.

  Both are centred on the screen and both do exactly `onRestart`, so with the
  debrief up they are two buttons for one action with one hidden behind the
  other — which is what the first full browser run reported, as the card
  intercepting the pointer on `[data-testid="restart"]`. The card carries "Fly
  again"; this is what is left when there is no card, and that case is real
  rather than theoretical: `flightOver` includes running out of propellant,
  which ends the flight while the vehicle is still in the air and has no
  touchdown to debrief.
-->
{#if flightOver && debriefCard === null}
  <button class="restart" type="button" data-control="restart" data-testid="restart" onclick={onRestart}>Restart</button>
{/if}
<Debrief
  card={debriefCard}
  onRestart={onRestart}
  onBlackBox={() => (blackBoxOpen = true)}
  onClose={() => (debriefCard = null)}
/>
<BlackBox
  open={blackBoxOpen}
  {recorder}
  events={timeline.events}
  previous={previousRecorder}
  scenarioId={currentPreset.basedOn ?? currentPreset.id}
  onClose={() => (blackBoxOpen = false)}
/>
<Menu
  open={menuOpen}
  {time}
  {randomFailure}
  {tiltControl}
  onClose={() => (menuOpen = false)}
  onTimeChange={(next) => (time = next)}
  {onConfigure}
  {onToggleRandomFailure}
  onToggleTiltControl={() => (tiltControl = !tiltControl)}
  onShowInfo={(view) => (infoView = view)}
/>
<InfoView view={infoView} onClose={() => (infoView = null)} />

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #a7bdd9;
    /*
      The type, set once at the root so nothing inherits the platform default.
      The components each declare their own size and weight from the token
      scale; this is what everything falls back to.
    */
    font-family: var(--font);
    font-variant-numeric: tabular-nums;
  }
  canvas {
    display: block;
    position: absolute;
    inset: 0;
  }
  /*
    The end-of-flight restart. It is the one element in the interface allowed to
    sit in the middle of the screen, because at that moment there is nothing
    behind it worth looking at — the flight is over.
  */
  .restart {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    appearance: none;
    border: 1px solid var(--ink-70);
    border-radius: var(--radius);
    padding: 0.7rem 1.6rem;
    font-family: var(--font-condensed);
    font-size: 0.9rem;
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-100);
    background: rgb(6 8 12 / 80%);
    backdrop-filter: blur(6px);
    cursor: pointer;
    touch-action: manipulation;
  }
  .restart:hover {
    background: rgb(255 255 255 / 14%);
  }

  /*
    IN FLOW, not positioned (M12.4). It is a child of the clock's row now, so
    its place is decided by that row's `margin-left: auto` rather than by
    offsets that had to be kept clear of a strip they knew nothing about.
    `position: relative` remains, because the camera selector still hangs
    beneath it.
  */
  .top-right {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  /*
    The camera row, on its own line under the buttons (M12.4).

    IN FLOW, not absolute. It was positioned, which meant it added no height to
    the row above it — so nothing downstream knew it was there, and review
    measured it sitting on top of the trajectory map on a landscape phone in
    cinematic mode. A wrapped flex line has a height, and a height is what the
    rest of the layout can be told about.
  */
  .camera-modes {
    flex-basis: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  .top-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.45rem 0.7rem;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    background: var(--panel);
    backdrop-filter: blur(6px);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease;
  }
  .top-button:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }
  /* Same pip as a ControlButton: state is a thing that fills, not a colour. */
  .pip {
    flex: none;
    width: 0.4rem;
    height: 0.4rem;
    border: 1px solid var(--ink-45);
    background: transparent;
  }
  .top-button.is-on {
    border-color: var(--ink-70);
    background: rgb(255 255 255 / 14%);
    color: var(--ink-100);
  }
  .top-button.is-on .pip {
    background: var(--ink-100);
    border-color: var(--ink-100);
  }
</style>
