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
    type ClassTarget,
    type HudBinder,
    type IndicatorBinder,
    type TextTarget,
  } from '$hud/binder';
  import Hud from './Hud.svelte';
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

  let canvas: HTMLCanvasElement;

  /**
   * The one HUD binder. Created when Hud.svelte reports its elements, which
   * may be before or after the async view start finishes — the tick reads it
   * through this binding rather than closing over it, so neither order breaks.
   */
  let hud: HudBinder | undefined;

  const onHudReady = (
    resolve: (id: string) => { value: TextTarget | null; unit: TextTarget | null },
  ) => {
    hud = createHudBinder({ resolve });
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
  let time = $state<TimeSetting>(REAL_TIME);
  let randomFailure = $state(false);

  /** What the current flight was configured from, so a partial edit has a base. */
  let currentPreset: ScenarioPreset = INTRO;

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
    currentPreset = fieldsToPreset(fields, currentPreset);
    const fresh = createScenarioState(currentPreset);
    fresh.failures.randomFailure = randomFailure;
    loopState.state = fresh;
    loopState.previous = fresh;
    loopState.accumulator = 0;
    menuOpen = false;
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
        isBlocked: () => menuOpen,
      });

      // Tilt yields to a hand on the yoke, and is only meaningful on a device
      // that reports orientation at all.
      const tilt: InputBinding = bindTilt(window, {
        control: emit,
        isManual: () => loop.state.autopilot.manualControlOn,
        orientationAngle: () => screen.orientation?.angle ?? 0,
      });

      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const frameTime = (now - last) / 1000;
        last = now;

        advance(loop, frameTime, toLoopOptions(time));

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
        hud?.update(s);
        indicators?.update(s);
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
      indicators?.destroy();
      view?.destroy();
    };
  });
</script>

<canvas bind:this={canvas} aria-label="Starship Simulator"></canvas>
<Hud onready={onHudReady} />
<Controls {emit} {zoom} onready={onControlsReady} />
<button class="menu-button" type="button" data-menu-control="open" onclick={() => (menuOpen = true)}>
  Menu
</button>
<Menu
  open={menuOpen}
  {time}
  {randomFailure}
  onClose={() => (menuOpen = false)}
  onTimeChange={(next) => (time = next)}
  {onConfigure}
  {onToggleRandomFailure}
/>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #a7bdd9;
  }
  canvas {
    display: block;
    position: absolute;
    inset: 0;
  }
  .menu-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.45rem 0.7rem;
    font: 600 0.72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #000;
    background: rgb(255 255 255 / 43%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 20%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
  }
</style>
