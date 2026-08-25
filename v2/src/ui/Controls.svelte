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
  }

  const { emit, onready }: Props = $props();

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
  <div class="left"><EnginePanel {emit} /></div>
  <div class="right"><YokePanel {emit} /></div>
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
    pointer-events: auto;
  }

  @media (width < 32rem) {
    .controls {
      gap: 0.4rem;
      padding: 0.4rem;
    }
  }
</style>
