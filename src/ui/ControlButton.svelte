<!--
  One control button.

  It emits its event and nothing else. Whether it reads as lit is not its
  business — the indicator binder owns that, because the state it reflects can
  change without anyone pressing anything (the autopilot shuts engines down; a
  landing clears autoLand). A button that painted itself on click would show a
  lie the first time the simulation disagreed with it.

  So: `data-indicator` is the binder's hook, and the button is a dumb emitter.

  M6.4 — STATE IS PHYSICAL, NOT A COLOUR OF TEXT. The 2021 build wrote
  `style.color = '#00ff00'` on every repaint and v2 kept the idea as a green
  `.is-on` rule. Both say "on" by recolouring a word, which is the one thing
  BROADCAST-UI-PLAN § 1 principle 6 rules out: engines are dots that light,
  propellant is a bar that drains, nothing is a green word saying ON. So every
  control with a state carries a pip — a small square that fills — and the
  surface lifts behind it. The label itself never changes colour, which also
  happens to be why the contrast holds in both states.
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
    /** Stable identifier for the e2e suite. See ui/testids.ts. */
    testid: string;
  }

  const { label, event, emit, indicator, wide = false, testid }: Props = $props();
</script>

<button
  class="control"
  class:wide
  class:stateful={indicator !== undefined}
  type="button"
  data-indicator={indicator}
  data-testid={testid}
  onclick={() => emit(event)}
>
  {#if indicator !== undefined}
    <span class="pip" aria-hidden="true"></span>
  {/if}
  <span class="label">{label}</span>
</button>

<style>
  .control {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    /*
      The 44px floor, which this button was 26px short of until M6.6's touch
      audit measured it. `--touch` calls itself "the smallest touch target we
      allow anywhere" and it meant it: this is a game you fly with a finger on
      any device that has one, and a 26px Auto-Land is a mis-tap waiting to
      happen on a phone and merely fiddly on a laptop trackpad.
    */
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.4rem 0.55rem;
    background: var(--panel);
    backdrop-filter: blur(6px);
    cursor: pointer;
    touch-action: manipulation;
    /* Colour changes are state; a transition on them reads as the state
       arriving rather than the page redrawing. */
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease;
  }
  .label {
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    white-space: nowrap;
  }
  .pip {
    flex: none;
    width: 0.4rem;
    height: 0.4rem;
    border: 1px solid var(--ink-45);
    background: transparent;
  }

  .control:hover {
    border-color: var(--ink-45);
  }
  .control:active {
    background: rgb(255 255 255 / 10%);
  }
  .wide {
    grid-column: 1 / -1;
    justify-content: center;
  }

  /*
    The lit state. 2021 wrote `style.color = '#00ff00'` and a background on
    every button on every repaint; here the binder toggles this one class, and
    only when the boolean actually flipped.
  */
  .control:global(.is-on) {
    border-color: var(--ink-70);
    background: rgb(255 255 255 / 14%);
  }
  .control:global(.is-on) .pip {
    background: var(--ink-100);
    border-color: var(--ink-100);
  }
  .control:global(.is-on) .label {
    color: var(--ink-100);
  }
</style>
