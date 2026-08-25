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
  import { createIntroState } from '$core/scenarios';
  import { advance, createLoopState } from '$app/loop';
  import { vehicleHeight } from '$core/constants';
  import { createHudBinder, type HudBinder, type TextTarget } from '$hud/binder';
  import Hud from './Hud.svelte';

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

  onMount(() => {
    let view: ViewApp | undefined;
    let frame = 0;
    let disposed = false;

    const start = async () => {
      const initial = createIntroState();
      const loop = createLoopState(initial);

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

      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const frameTime = (now - last) / 1000;
        last = now;

        advance(loop, frameTime);

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

        // The single per-frame HUD subscriber. It diffs; most frames write nothing.
        hud?.update(s);
      };
      frame = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener('resize', onResize);
      };
    };

    const cleanup = start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      void cleanup.then((fn) => fn?.());
      hud?.destroy();
      view?.destroy();
    };
  });
</script>

<canvas bind:this={canvas} aria-label="Starship Simulator"></canvas>
<Hud onready={onHudReady} />

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
</style>
