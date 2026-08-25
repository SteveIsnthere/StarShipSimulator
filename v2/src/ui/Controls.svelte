<!--
  The flight controls: engine panel left, yoke panel right.

  This component owns the indicator binder, for the same reason App.svelte owns
  the readout binder — the nodes it binds are the ones it renders, so binding
  after mount is the only order that can work.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import EnginePanel from './EnginePanel.svelte';
  import YokePanel from './YokePanel.svelte';
  import type { Emit } from './controls';
  import type { ClassTarget } from '$hud/binder';

  interface Props {
    emit: Emit;
    /** Called once, after mount, with a resolver over the rendered controls. */
    onready: (resolve: (id: string) => ClassTarget | null) => void;
    /** index.html:120 — the on-screen zoom buttons. */
    zoom: (direction: 1 | -1) => void;
    /**
     * Cinematic mode. Hidden, never unmounted — see below.
     */
    hidden?: boolean;
  }

  const { emit, onready, zoom, hidden = false }: Props = $props();

  let root: HTMLElement;

  /**
   * dispUpdate.js:156 — the panels collapse.
   *
   * On a phone in landscape the two panels take most of the screen, which is
   * why 2021 had this. Collapsed is a class change, not an unmount: the
   * indicator binder holds references to these nodes and resolves them once
   * (M4.2), so removing them from the DOM would leave it writing to orphans.
   */
  let leftOpen = $state(true);
  let rightOpen = $state(true);

  /**
   * Whether the panels are bottom sheets rather than side rails.
   *
   * CSS decides how they LOOK; this decides how they BEHAVE, and the two
   * genuinely differ. A rail can sit open beside the world indefinitely. A
   * sheet covers half a phone screen, so it starts closed and only one may be
   * open at a time — that is a rule about state, and a media query cannot hold
   * state. The breakpoint string is the same in both places and is the thing to
   * keep in step.
   */
  const PHONE = '(width < 37.5rem)';
  let phone = $state(false);

  const openLeft = () => {
    leftOpen = !leftOpen;
    if (phone && leftOpen) rightOpen = false;
  };
  const openRight = () => {
    rightOpen = !rightOpen;
    if (phone && rightOpen) leftOpen = false;
  };

  onMount(() => {
    // Resolved once, here, and never again — the binder holds the references.
    // A plain record rather than a Map: nothing about this lookup is reactive,
    // it is built once and read by the binder, never written again.
    const found: Record<string, ClassTarget | undefined> = {};
    for (const el of root.querySelectorAll<HTMLElement>('[data-indicator]')) {
      const id = el.dataset['indicator'];
      if (id) found[id] = el;
    }
    onready((id) => found[id] ?? null);

    /*
      Sheets start closed, rails start open — and a device that rotates or a
      window that is dragged narrow has to switch. Only the FIRST transition
      into phone width closes them, so a pilot who opened a sheet does not have
      it slammed shut by an unrelated resize.
    */
    const media = window.matchMedia(PHONE);
    let wasPhone: boolean | undefined;
    const sync = () => {
      phone = media.matches;
      if (phone && wasPhone !== true) {
        leftOpen = false;
        rightOpen = false;
      } else if (!phone && wasPhone === true) {
        leftOpen = true;
        rightOpen = true;
      }
      wasPhone = phone;
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  });
</script>

<!--
  `class:hidden` rather than an {#if}: the indicator binder resolved every
  control in here exactly once and holds the references (M4.2). Unmounting them
  for cinematic mode would leave it writing into orphans, and switching back
  would show a panel frozen at whatever state it had when it left. `visibility`
  also removes them from hit-testing and from the accessibility tree, so a
  hidden panel cannot swallow a click on the world behind it.
-->
<div class="controls" class:hidden bind:this={root} inert={hidden}>
  <div class="left">
    <div class="panel-wrap" class:collapsed={!leftOpen} inert={!leftOpen}>
      <span class="handle" aria-hidden="true"></span>
      <EnginePanel {emit} />
    </div>
    <div class="corner">
      <button
        class="zoom tab"
        type="button"
        aria-label={leftOpen ? 'Hide engine controls' : 'Show engine controls'}
        aria-expanded={leftOpen}
        data-control="toggleLeft"
        data-testid="engine-panel-toggle"
        onclick={openLeft}
      >
        <span class="chevron" aria-hidden="true">{leftOpen ? '\u2039' : '\u203a'}</span>
        <span class="tab-label" aria-hidden="true">Engines</span>
      </button>
      <button class="zoom" type="button" aria-label="Zoom out" data-testid="zoom-out" onclick={() => zoom(-1)}>&minus;</button>
    </div>
  </div>
  <div class="right">
    <div class="panel-wrap" class:collapsed={!rightOpen} inert={!rightOpen}>
      <span class="handle" aria-hidden="true"></span>
      <YokePanel {emit} />
    </div>
    <div class="corner">
      <button class="zoom" type="button" aria-label="Zoom in" data-testid="zoom-in" onclick={() => zoom(1)}>+</button>
      <button
        class="zoom tab"
        type="button"
        aria-label={rightOpen ? 'Hide flight yoke' : 'Show flight yoke'}
        aria-expanded={rightOpen}
        data-control="toggleRight"
        data-testid="yoke-panel-toggle"
        onclick={openRight}
      >
        <span class="chevron" aria-hidden="true">{rightOpen ? '\u203a' : '\u2039'}</span>
        <span class="tab-label" aria-hidden="true">Yoke</span>
      </button>
    </div>
  </div>
</div>

<style>
  /*
    RAILS, NOT A BOTTOM BAR — moved here in M6.2.

    These panels used to sit along the bottom edge, which is where the lower
    third now lives. The collision was not cosmetic: the engine panel physically
    covered the engineering-strip toggle, and Playwright reported it exactly as
    it would have happened to a player — "R1 intercepts pointer events" on every
    attempt to click a control 200px away.

    docs/BROADCAST-UI-PLAN.md § 3 already had the answer: the controls are a
    left and a right rail down the sides, and the bottom band belongs to the
    telemetry. M6.4 restyles their surfaces; this is the position.
  */
  .controls.hidden {
    visibility: hidden;
    opacity: 0;
  }
  .controls {
    position: absolute;
    inset: 0;
    transition: opacity 0.18s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.75rem;
    gap: 0.75rem;
    pointer-events: none;
  }
  .left,
  .right {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    pointer-events: auto;
  }
  .right {
    align-items: flex-end;
  }
  .panel-wrap {
    transition: opacity 0.15s ease;
  }
  /*
    Hidden, not unmounted: the indicator binder resolved these nodes once and
    holds the references. `visibility` also takes them out of the hit-testing
    and the accessibility tree, so a collapsed panel cannot swallow a click.
  */
  .panel-wrap.collapsed {
    visibility: hidden;
    opacity: 0;
    height: 0;
    overflow: hidden;
  }
  .corner {
    display: flex;
    gap: 0.3rem;
  }
  /*
    The small square controls: zoom, and the two panel collapses. Same surface
    as a ControlButton, sized to the minimum touch target rather than to the
    glyph — 2rem was 32px, which is under the 44px floor and was genuinely
    awkward on a phone.
  */
  .zoom {
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    width: var(--touch);
    height: var(--touch);
    font-family: var(--font-condensed);
    font-size: 1rem;
    line-height: 1;
    color: var(--ink-70);
    background: var(--panel);
    backdrop-filter: blur(6px);
    cursor: pointer;
    touch-action: manipulation;
    transition: border-color 0.12s ease;
  }
  .zoom:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }

  .handle,
  .tab-label {
    display: none;
  }

  /* --- phone portrait: the panels become bottom sheets --------------------

    A rail down the side of a 390px screen would be most of the screen. So
    below 37.5rem each panel is a sheet that rises from the bottom edge over
    the telemetry, with a drag handle and a tab that names it, and only one is
    open at a time (the rule lives in the script — a media query cannot hold
    state). They start closed, because the world is the point.
  */
  @media (width < 37.5rem) {
    .controls {
      inset: auto 0 0 0;
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.4rem;
      padding: 0 calc(var(--safe-right) + 0.4rem) calc(var(--safe-bottom) + 0.4rem)
        calc(var(--safe-left) + 0.4rem);
    }
    .left,
    .right {
      align-items: stretch;
    }
    .panel-wrap {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(var(--touch) + var(--safe-bottom) + 0.8rem);
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      max-height: 55dvh;
      overflow-y: auto;
      padding: 0.5rem calc(var(--safe-right) + var(--gutter)) 1rem
        calc(var(--safe-left) + var(--gutter));
      background: rgb(6 8 12 / 94%);
      backdrop-filter: blur(14px);
      border-top: var(--hairline);
    }
    .handle {
      display: block;
      width: 2.5rem;
      height: 3px;
      border-radius: 2px;
      background: var(--ink-25);
    }
    .tab {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: auto;
      padding: 0 0.7rem;
    }
    .tab-label {
      display: inline;
      font-family: var(--font-condensed);
      font-size: var(--size-label);
      letter-spacing: var(--track-label);
      text-transform: uppercase;
    }
  }

  /*
    Phone landscape is a compressed desktop, not a sheet layout: there is width
    to spare and almost no height, which is the opposite problem. Keyed on
    height because a 390x664 phone turned sideways is 664 wide and no width
    query can tell it from a small laptop.
  */
  @media (height < 31.25rem) and (orientation: landscape) {
    .controls {
      padding: 0 0.5rem;
    }
  }
</style>
