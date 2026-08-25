<!--
  Engine controls: three Raptors, a toggle-all, the throttle, and the safe guard.

  index.html:72 — the left-hand panel.
-->
<script lang="ts">
  import ControlButton from './ControlButton.svelte';
  import type { Emit } from './controls';
  import { throttleLowerLimit, throttleUpperLimit } from '$core/constants';
  import type { RaptorIndex } from '$core/state';

  interface Props {
    emit: Emit;
  }
  const { emit }: Props = $props();

  const engines: RaptorIndex[] = [0, 1, 2];

  /**
   * The value is read off the event rather than out of a bound variable.
   *
   * `bind:value` works here — checked, not assumed — but it would add a piece
   * of reactive state duplicating something the DOM already holds, and the
   * duplicate has no reader: the simulation's throttle is a different number
   * anyway, since it chases the command at `throttleSpeed` rather than matching
   * it. The element is the state.
   */
  const onThrottle = (event: Event & { currentTarget: HTMLInputElement }) => {
    emit({ type: 'throttle', percent: event.currentTarget.valueAsNumber });
  };
</script>

<section class="panel">
  <span class="title">Engine Controls</span>

  <div class="grid">
    {#each engines as engine (engine)}
      <ControlButton
        label={`R${engine + 1}`}
        event={{ type: 'raptor', engine }}
        indicator={`raptor${engine}`}
        testid={`raptor-${engine}`}
        {emit}
      />
    {/each}

    <ControlButton
      label="Toggle-All"
      event={{ type: 'allRaptors' }}
      indicator="allRaptors"
      testid="all-raptors"
      wide
      {emit}
    />

    <input
      class="slider"
      type="range"
      aria-label="Throttle"
      data-control="throttle"
      data-testid="throttle"
      min={throttleLowerLimit}
      max={throttleUpperLimit}
      step="1"
      value="100"
      oninput={onThrottle}
    />

    <ControlButton
      label="Thrust Safe Guard"
      event={{ type: 'autoMaxThrust' }}
      indicator="autoMaxThrust"
      testid="auto-max-thrust"
      wide
      {emit}
    />
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }
  .title {
    font: 500 0.68rem/1 var(--font-condensed);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    opacity: 0.7;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(2.6rem, 1fr));
    gap: 0.25rem;
  }
  .slider {
    grid-column: 1 / -1;
    width: 100%;
    accent-color: #0d0;
  }
</style>
