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
    <EnginePanel {emit} />
    <button class="zoom" type="button" aria-label="Zoom out" onclick={() => zoom(-1)}>&minus;</button>
  </div>
  <div class="right">
    <YokePanel {emit} />
    <button class="zoom" type="button" aria-label="Zoom in" onclick={() => zoom(1)}>+</button>
  </div>
</div>

<style>
  .controls {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0.75rem;
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
  .zoom {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    width: 2rem;
    height: 2rem;
    font: 600 1rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
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
