<script lang="ts">
  import { onMount } from 'svelte';
  import { createView, type ViewApp } from '$view/app';
  import { updateCamera } from '$view/camera';
  import { loadTextures } from '$view/assets';
  import { createWorld } from '$view/world';
  import { createVehicle } from '$view/vehicle';
  import { createParticleSystem, createParticleTexture } from '$view/particles';
  import { createEffectDriver } from '$view/effects';
  import { createIntroState } from '$core/scenarios';
  import { advance, createLoopState } from '$app/loop';
  import { vehicleHeight } from '$core/constants';

  let canvas: HTMLCanvasElement;
  let status = $state('starting');

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

      const particles = createParticleSystem(createParticleTexture(view.app.renderer));
      const effects = createEffectDriver();
      view.layers.effectsBehind.addChild(particles.container);

      const onResize = () => view?.resize(window.innerWidth, window.innerHeight);
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

        world.update(view!.camera, view!.viewport, s.kinematics.speedX);
        vehicle.update(view!.camera, view!.viewport, {
          altitude: s.kinematics.altitude,
          downRangeDistance: s.kinematics.downRangeDistance,
          pitch: s.kinematics.pitch,
          frontFinExtension: s.vehicle.frontFinExtension,
          aftFinExtension: s.vehicle.aftFinExtension,
        });

        effects.update(particles, view!.camera, view!.viewport, s, loop.previous, frameTime);

        status = `${s.kinematics.altitude.toFixed(0)} m · ${s.kinematics.speedY.toFixed(1)} m/s`;
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
      view?.destroy();
    };
  });
</script>

<canvas bind:this={canvas} aria-label="Starship Simulator"></canvas>
<div class="readout" role="status">{status}</div>

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
  .readout {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    font: 500 0.8rem/1.4 ui-monospace, monospace;
    color: #0b1017;
    letter-spacing: 0.04em;
    pointer-events: none;
  }
</style>
