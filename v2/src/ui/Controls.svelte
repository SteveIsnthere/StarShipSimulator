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
  }

  const { emit, onready, zoom }: Props = $props();

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
  });
</script>

<div class="controls" bind:this={root}>
  <div class="left">
    <div class="panel-wrap" class:collapsed={!leftOpen}><EnginePanel {emit} /></div>
    <div class="corner">
      <button
        class="zoom"
        type="button"
        aria-label={leftOpen ? 'Hide engine controls' : 'Show engine controls'}
        data-control="toggleLeft"
        data-testid="engine-panel-toggle"
        onclick={() => (leftOpen = !leftOpen)}>{leftOpen ? '\u2039' : '\u203a'}</button>
      <button class="zoom" type="button" aria-label="Zoom out" data-testid="zoom-out" onclick={() => zoom(-1)}>&minus;</button>
    </div>
  </div>
  <div class="right">
    <div class="panel-wrap" class:collapsed={!rightOpen}><YokePanel {emit} /></div>
    <div class="corner">
      <button class="zoom" type="button" aria-label="Zoom in" data-testid="zoom-in" onclick={() => zoom(1)}>+</button>
      <button
        class="zoom"
        type="button"
        aria-label={rightOpen ? 'Hide flight yoke' : 'Show flight yoke'}
        data-control="toggleRight"
        data-testid="yoke-panel-toggle"
        onclick={() => (rightOpen = !rightOpen)}>{rightOpen ? '\u203a' : '\u2039'}</button>
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
  .controls {
    position: absolute;
    inset: 0;
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
  .zoom {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    width: 2rem;
    height: 2rem;
    font: 600 1rem/1 var(--font);
    color: #000;
    background: rgb(255 255 255 / 43%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 20%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
    touch-action: manipulation;
  }

  @media (width < 32rem) {
    .controls {
      gap: 0.4rem;
      padding: 0.4rem;
    }
  }
</style>
