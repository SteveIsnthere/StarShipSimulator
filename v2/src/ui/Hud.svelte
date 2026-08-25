<!--
  The HUD markup.

  Svelte's only job here is to render this list once, on mount, and hand the
  resulting text nodes to the binder. There is no reactive state in this
  component and no `$state` anywhere near a readout value: if the values were
  reactive, every frame would schedule a Svelte update, which is exactly the
  per-frame framework work CLAUDE.md forbids.

  So the contract is: Svelte owns the structure, the binder owns the text.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { READOUTS } from '$hud/readouts';
  import type { TextTarget } from '$hud/binder';
  import { readoutTestId, readoutUnitTestId, readoutValueTestId } from './testids';

  interface Props {
    /** Called once, after mount, with a resolver over the rendered elements. */
    onready: (resolve: (id: string) => { value: TextTarget | null; unit: TextTarget | null }) => void;
  }

  const { onready }: Props = $props();

  const valueEls: Record<string, HTMLElement> = {};
  const unitEls: Record<string, HTMLElement> = {};

  /**
   * dispUpdate.js:193 — the secondary readouts collapse, leaving altitude and
   * speed. Hidden rather than unmounted, for the same reason as the control
   * panels: the binder resolved these text nodes once and holds them.
   */
  let expanded = $state(true);

  onMount(() => {
    onready((id) => ({ value: valueEls[id] ?? null, unit: unitEls[id] ?? null }));
  });
</script>

<div class="hud" role="status" aria-live="off">
  {#each READOUTS as readout (readout.id)}
    <div
      class="row"
      class:collapsed={!expanded && !readout.primary}
      data-readout={readout.id}
      data-testid={readoutTestId(readout.id)}
    >
      <span class="label">{readout.label}</span>
      <span class="value" data-testid={readoutValueTestId(readout.id)} bind:this={valueEls[readout.id]}></span>
      <span class="unit" data-testid={readoutUnitTestId(readout.id)} bind:this={unitEls[readout.id]}></span>
    </div>
  {/each}
  <button
    class="toggle"
    type="button"
    data-hud-control="expand"
    data-testid="hud-toggle"
    aria-label={expanded ? 'Hide detailed readouts' : 'Show detailed readouts'}
    onclick={() => (expanded = !expanded)}
  >
    {expanded ? '\u2039' : '\u203a'}
  </button>
</div>

<style>
  .hud {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    display: grid;
    gap: 0.1rem;
    font: 500 0.8rem/1.35 var(--font);
    color: #0b1017;
    letter-spacing: 0.04em;
    pointer-events: none;
    text-shadow: 0 1px 0 rgb(255 255 255 / 45%);
  }
  .row {
    display: grid;
    grid-template-columns: 3.2rem 4.2rem auto;
    align-items: baseline;
  }
  .row.collapsed {
    visibility: hidden;
    height: 0;
    overflow: hidden;
  }
  .label {
    font-family: var(--font-condensed);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    opacity: 0.65;
  }
  .toggle {
    justify-self: start;
    margin-top: 0.15rem;
    appearance: none;
    border: 0;
    border-radius: 0.4rem;
    padding: 0.05rem 0.35rem;
    font: inherit;
    color: inherit;
    background: rgb(255 255 255 / 35%);
    pointer-events: auto;
    cursor: pointer;
  }
  .value {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    padding-left: 0.35rem;
    font-family: var(--font-condensed);
    letter-spacing: var(--track-label);
    opacity: 0.65;
    font-size: 0.72rem;
  }
</style>
