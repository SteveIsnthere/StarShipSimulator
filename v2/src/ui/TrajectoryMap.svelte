<!--
  The trajectory map (M7.1).

  WHY IT EXISTS, measured rather than asserted (docs/DEPTH-AND-SPEED-PLAN.md § 2):
  the main viewport is 356 x 200 metres at every altitude, so the ground leaves
  the screen above ~100 m and every scenario but the final landing is flown
  against a featureless sky. No single camera can fix that — showing the ground
  from 75 km needs 0.0096 px/m, at which a 50 m vehicle is half a pixel tall. So
  the scales the main view cannot reach get a second display, and this is it.

  A PROFILE, not a plan view: altitude against downrange, seen from the side.
  This world has two dimensions, so a top-down map would be a horizontal line —
  and the profile happens to be the view that answers what every scenario is
  actually about, which is whether you are going to make it home.

  ALWAYS-ON AND COLLAPSIBLE, by owner decision (2026-08-25). Glanceable with no
  interaction, and it folds away like the engineering strip for anyone who wants
  the world back. The choice is remembered per device through the same guarded
  `localStorage` read M6.4 uses — a browser with site data blocked THROWS on
  access rather than returning null, and a simulator that will not start because
  it could not remember a preference would be a poor trade.

  NOTHING HERE RENDERS PER FRAME. Svelte owns one boolean (`expanded`, which a
  click changes) and the canvas element. The pixels are drawn by
  `$hud/trajectory-draw` from App.svelte's single rAF subscriber, throttled to
  MAP_REDRAW_HZ — the same law as every other binder, for the same reason.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapContext, MapSurface } from '$hud/trajectory-draw';
  import { MAP_KEY, PREFERENCES_RESET_EVENT } from './preferences';

  interface Props {
    /**
     * Called once, after mount, with the surface the tick drives.
     *
     * Null when the browser refuses a 2D context — a real possibility on a
     * device that has already spent its GPU budget on the Pixi canvas, and one
     * that must leave the rest of the simulator working.
     */
    onready: (surface: MapSurface | null) => void;
  }

  const { onready }: Props = $props();


  /**
   * The lower third is COMPRESSED on a phone in either orientation — the same
   * distinction M6.8 learned twice: a landscape phone is over 600 px wide and
   * looks like a small laptop to a width query, but has 390 px of height to
   * spend. A map is the first thing that should not be spending it, so it
   * starts folded there and open everywhere else.
   */
  const startsCollapsed = (): boolean => {
    try {
      return (
        window.matchMedia('(width < 37.5rem)').matches ||
        window.matchMedia('(height < 31.25rem) and (orientation: landscape)').matches
      );
    } catch {
      return false;
    }
  };

  const readExpanded = (): boolean => {
    try {
      const stored = localStorage.getItem(MAP_KEY);
      if (stored !== null) return stored === '1';
    } catch {
      // Storage blocked. Fall through to the layout default; the toggle still
      // works for this session, it just will not be remembered.
    }
    return !startsCollapsed();
  };

  let expanded = $state(true);
  let canvas: HTMLCanvasElement;
  let frame: HTMLElement;
  let root: HTMLElement;

  /** The record the tick reads. Created once; mutated, never replaced. */
  let surface: MapSurface | null = null;

  const toggle = () => {
    expanded = !expanded;
    if (surface) {
      surface.visible = expanded;
      // Revealing a canvas that has been sitting collapsed shows whatever was
      // on it when it was hidden — which is a stale flight. One forced redraw.
      if (expanded) surface.dirty = true;
    }
    try {
      localStorage.setItem(MAP_KEY, expanded ? '1' : '0');
    } catch {
      // See readExpanded.
    }
  };

  /**
   * Put the fold back where a fresh profile starts (M12.5).
   *
   * The menu's Restore Defaults clears `MAP_KEY`, which is only half the job:
   * without this the map keeps whatever fold it had for the rest of the
   * session and then silently changes on the next visit, which is the most
   * confusing possible outcome of pressing a button labelled Restore Defaults.
   * `readExpanded` with nothing stored is the layout default, so this is the
   * same code path a fresh load takes.
   */
  const applyDefaults = () => {
    expanded = readExpanded();
    if (surface) {
      surface.visible = expanded;
      if (expanded) surface.dirty = true;
    }
  };

  onMount(() => {
    expanded = readExpanded();
    window.addEventListener(PREFERENCES_RESET_EVENT, applyDefaults);

    const context = canvas.getContext('2d');
    if (!context) {
      onready(null);
      return;
    }

    /*
      Sized in DEVICE pixels with no transform applied, so the projection works
      in device pixels for free and nothing is resampled at paint time. The
      CSS-pixel intentions — a 1 px line, a 9 px label — are multiplied by
      `scale` inside the renderer instead.
    */
    const resize = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (canvas.width === width && canvas.height === height && surface?.scale === ratio) return;
      // Assigning either dimension CLEARS the canvas, which is why this sets
      // `dirty` rather than trusting the next throttled tick: for up to 100 ms
      // a resized map would otherwise be blank.
      canvas.width = width;
      canvas.height = height;
      if (surface) {
        surface.scale = ratio;
        surface.dirty = true;
      }
    };

    surface = {
      context: context as MapContext,
      status: root,
      scale: window.devicePixelRatio || 1,
      visible: expanded,
      dirty: true,
    };
    resize();
    onready(surface);

    // ResizeObserver rather than a window listener: the panel changes size when
    // the lower third reflows, not only when the window does.
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => {
      observer.disconnect();
      window.removeEventListener(PREFERENCES_RESET_EVENT, applyDefaults);
    };
  });
</script>

<!--
  `data-marker` and `data-span` are written here by the renderer, diffed. They
  are what makes the map assertable from outside: a canvas can only be checked
  by comparing pixels, which goes red for a colour change and says nothing
  about whether the vehicle moved.
-->
<div
  class="map"
  class:collapsed={!expanded}
  data-testid="trajectory-map"
  bind:this={root}
>
  <button
    class="map-toggle bc-label"
    type="button"
    data-testid="map-toggle"
    aria-expanded={expanded}
    aria-label={expanded ? 'Hide trajectory map' : 'Show trajectory map'}
    onclick={toggle}
  >
    <span class="pip" aria-hidden="true"></span>
    Trajectory
  </button>
  <!--
    Hidden with `visibility` rather than unmounted, exactly as the engineering
    strip is: the tick holds a reference to this context and removing the canvas
    would leave it drawing into an orphan.
  -->
  <div class="frame" bind:this={frame}>
    <canvas bind:this={canvas} data-testid="map-canvas" aria-hidden="true"></canvas>
  </div>
</div>

<style>
  .map {
    display: grid;
    gap: 0.2rem;
    justify-items: start;
  }

  .map-toggle {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: var(--touch);
    appearance: none;
    border: none;
    padding: 0;
    background: transparent;
    color: var(--ink-45);
    cursor: pointer;
    touch-action: manipulation;
  }
  .map-toggle:hover {
    color: var(--ink-100);
  }
  /* The same pip as a ControlButton: state is a thing that fills, not a hue. */
  .pip {
    flex: none;
    width: 0.4rem;
    height: 0.4rem;
    border: 1px solid var(--ink-45);
    background: transparent;
  }
  .map:not(.collapsed) .pip {
    background: var(--ink-100);
    border-color: var(--ink-100);
  }

  /*
    A DEFINITE height, and the number is not arbitrary: the toggle's touch
    target plus this must not exceed the gauge column beside it, because the
    row's height is the tallest thing in it and a taller lower third moves every
    readout up a thinner part of the scrim — a contrast budget M6.8 certified
    and a11y.spec.ts guards. 44 + 3 + 72 = 119, against the dials' 120.
  */
  .frame {
    position: relative;
    width: 17.5rem;
    height: 4.5rem;
    border: var(--hairline);
    border-radius: var(--radius);
    background: rgb(6 8 12 / 45%);
  }
  .map.collapsed .frame {
    visibility: hidden;
    height: 0;
    border-width: 0;
    overflow: hidden;
  }
  /*
    Taken out of flow, which is load-bearing rather than tidy.

    A canvas's width and height ATTRIBUTES are its intrinsic CSS size, and this
    one carries a DEVICE-pixel buffer. In flow, on a display with a ratio above
    1, that intrinsic size fed back into the box that had just been measured to
    compute it — each resize sizing the buffer from a box the buffer had made
    bigger. Measured: a 104 px frame ran away to 163 px. Absolute positioning
    breaks the loop by making the intrinsic size irrelevant to layout.
  */
  canvas {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  @media (width < 37.5rem) {
    /*
      A phone's bar is a one-column grid, so there is no row height to inherit
      and the map states its own — the full width, and as little height as an
      instrument can be read in. It starts collapsed here anyway.
    */
    .frame {
      width: 100%;
      height: 4.5rem;
    }
    .map {
      width: 100%;
      height: auto;
    }
  }

  /*
    Phone landscape: the map floats over the sky (see the `.map-slot` note in
    Broadcast.svelte) and has to fit between the clock above it and the left
    rail's controls below. Measured: 48 px down to about 156 px, so the whole
    panel gets 97 of those — a toggle, and a strip of instrument.
  */
  @media (height < 31.25rem) and (orientation: landscape) {
    .frame {
      width: 15rem;
      height: 3rem;
    }
  }
</style>
