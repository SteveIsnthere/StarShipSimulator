<script lang="ts">
  import { onMount } from 'svelte';
  import { createView, type ViewApp } from '$view/app';
  import { updateCamera, worldToScreen } from '$view/camera';
  import { loadTextures } from '$view/assets';
  import { createWorld } from '$view/world';
  import { createVehicle } from '$view/vehicle';
  import { createParticleSystem, createParticleTexture } from '$view/particles';
  import { createEffectDriver } from '$view/effects';
  import { createSky } from '$view/sky';
  import { bloomIntensity, createPostPass, heatIntensity } from '$view/post';
  import { heatLimit } from '$core/constants';
  import { createIntroState, createScenarioState, INTRO, type ScenarioPreset } from '$core/scenarios';
  import { advance, createLoopState, type LoopState } from '$app/loop';
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
  import { createTimeline } from '$hud/timeline';
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
   * The flight recorder.
   *
   * Held outside SimState on purpose: the history is unbounded and SimState is
   * cloned every step, so growing arrays inside it would make each step cost
   * O(flight length) and would put the whole recording into every golden
   * fixture. See app/recorder.ts.
   */
  const recorder = createRecorder();

  /**
   * Sampled per STEP, not per frame.
   *
   * The recorder's rule is "every fifth frame" in 2021's sense, where a frame
   * was a step. A frame here runs however many steps the accumulator drained,
   * so sampling once per frame would skip most sampling points and record a
   * different flight at a different frame rate. See AdvanceOptions.onStep.
   *
   * A stable function, so passing it costs no allocation.
   */
  const onStep = (state: import('$core/state').SimState) => recorder.sample(state);

  let time = $state<TimeSetting>(REAL_TIME);
  let randomFailure = $state(false);
  /** eventListener.js:117 — on by default, as 2021 had it. */
  let tiltControl = $state(true);
  /**
   * The end-of-flight restart. dispUpdate.js:47 revealed a button when the
   * flight ended; here the same condition drives it.
   */
  let flightOver = $state(false);

  /** Recomputed only when the time setting changes, never per frame. */
  const loopOptions = $derived({ ...toLoopOptions(time), onStep });

  /** What the current flight was configured from, so a partial edit has a base. */
  let currentPreset: ScenarioPreset = INTRO;

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
    recorder.clear();
    flightOver = false;
  };

  const onRestart = () => startFlight(currentPreset);

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

      const textures = await loadTextures();
      if (disposed) {
        view.destroy();
        return;
      }
      const world = createWorld(textures);
      const vehicle = createVehicle(textures);
      view.layers.world.addChild(world.container);
      view.layers.vehicle.addChild(vehicle.container);

      const sky = createSky(view.app.renderer);
      view.layers.sky.addChild(sky.container);

      const particles = createParticleSystem(createParticleTexture(view.app.renderer));
      const effects = createEffectDriver();
      view.layers.effectsBehind.addChild(particles.container);

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

        // `loopOptions` is derived, so this allocates only when the time-warp
        // setting changes — not on every frame, which the budget forbids.
        advance(loop, frameTime, loopOptions);

        const s = loop.state;
        updateCamera(
          view!.camera,
          {
            downRangeDistance: s.kinematics.downRangeDistance,
            altitude: s.kinematics.altitude,
            speedX: s.kinematics.speedX,
            speedY: s.kinematics.speedY,
            landed: s.status.landed,
            onTheGround: s.status.onTheGround,
            crashed: s.failures.crashed,
          },
          view!.viewport,
          frameTime,
        );

        sky.update(view!.camera, view!.viewport, s.kinematics.altitude);
        world.update(view!.camera, view!.viewport, s.kinematics.speedX);
        vehicle.update(view!.camera, view!.viewport, {
          altitude: s.kinematics.altitude,
          downRangeDistance: s.kinematics.downRangeDistance,
          pitch: s.kinematics.pitch,
          frontFinExtension: s.vehicle.frontFinExtension,
          aftFinExtension: s.vehicle.aftFinExtension,
        });

        effects.update(particles, view!.camera, view!.viewport, s, loop.previous, frameTime);

        elapsed += frameTime;
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
        timeline.observe(s);

        hud?.update(s);
        metrics?.update(s);
        timelineBinder?.update();
        indicators?.update(s);

        // dispUpdate.js:47 — the same four conditions that revealed the restart
        // button. Assigning an unchanged boolean does not schedule a Svelte
        // update, so this costs nothing on the frames where it has not changed.
        const over =
          s.status.landed || s.failures.crashed || s.failures.inFlightBreakUp || s.failures.fuelRunOut;
        if (over !== flightOver) flightOver = over;
      };
      frame = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener('resize', onResize);
        keyboard.destroy();
        tilt.destroy();
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
    };
  });
</script>

<canvas bind:this={canvas} aria-label="Starship Simulator"></canvas>
<Broadcast
  onready={onBroadcastReady}
  scenario={scenarioName}
  {scenarioId}
  ontimeline={onTimelineReady}
/>
<Controls {emit} {zoom} onready={onControlsReady} />
<!--
  Both top-right buttons live in one flex row rather than being positioned
  individually. They were absolutely positioned with hand-picked offsets at
  first, and the wider label overlapped its neighbour and swallowed its clicks —
  which an e2e caught. Letting the layout do the arithmetic cannot drift when a
  label changes.
-->
<div class="top-right">
  <button class="top-button" type="button" data-blackbox-control="open" data-testid="open-black-box" onclick={() => (blackBoxOpen = true)}>
    Black Box
  </button>
  <button class="top-button" type="button" data-menu-control="open" data-testid="open-menu" onclick={() => (menuOpen = true)}>
    Menu
  </button>
</div>

{#if flightOver}
  <button class="restart" type="button" data-control="restart" data-testid="restart" onclick={onRestart}>Restart</button>
{/if}
<BlackBox open={blackBoxOpen} {recorder} onClose={() => (blackBoxOpen = false)} />
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
      The `font:` shorthands in the components below and in the other panels
      each reset the family, so this is the floor rather than the whole story —
      M6.2 and M6.4 replace those shorthands with the token scale outright.
    */
    font-family: var(--font);
    font-variant-numeric: tabular-nums;
  }
  canvas {
    display: block;
    position: absolute;
    inset: 0;
  }
  .restart {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    appearance: none;
    border: 0;
    border-radius: 0.6rem;
    padding: 0.7rem 1.4rem;
    font: 700 0.9rem/1 var(--font);
    letter-spacing: 0.06em;
    color: #000;
    background: rgb(255 255 255 / 75%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 25%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
  }
  .top-right {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: flex;
    gap: 0.4rem;
  }
  .top-button {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.45rem 0.7rem;
    font: 600 0.72rem/1 var(--font);
    color: #000;
    background: rgb(255 255 255 / 43%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 20%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
  }
</style>
