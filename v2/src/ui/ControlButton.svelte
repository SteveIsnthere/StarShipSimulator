<!--
  One control button.

  It emits its event and nothing else. Whether it reads as lit is not its
  business — the indicator binder owns that, because the state it reflects can
  change without anyone pressing anything (the autopilot shuts engines down; a
  landing clears autoLand). A button that painted itself on click would show a
  lie the first time the simulation disagreed with it.

  So: `data-indicator` is the binder's hook, and the button is a dumb emitter.
-->
<script lang="ts">
  import type { ControlEvent, Emit } from './controls';

  interface Props {
    label: string;
    event: ControlEvent;
    emit: Emit;
    /** Indicator id, when this control has a lit state. */
    indicator?: string;
    /** Grid span, for the wide buttons. */
    wide?: boolean;
  }

  const { label, event, emit, indicator, wide = false }: Props = $props();
</script>

<button
  class="control"
  class:wide
  type="button"
  data-indicator={indicator}
  onclick={() => emit(event)}
>
  {label}
</button>

<style>
  .control {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.4rem 0.55rem;
    font: 600 0.72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.03em;
    color: #000;
    background: rgb(255 255 255 / 43%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 20%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
    touch-action: manipulation;
  }
  .control:active {
    box-shadow: inset 2px 2px 5px 0 rgb(0 0 0 / 25%);
  }
  .wide {
    grid-column: 1 / -1;
  }

  /*
    The lit state. 2021 wrote `style.color = '#00ff00'` and a background on every
    button on every repaint; here the binder toggles this one class, and only
    when the boolean actually flipped.
  */
  .control:global(.is-on) {
    color: #0d0;
    background: rgb(255 255 255 / 24%);
  }
</style>
