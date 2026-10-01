<!--
  M12.1 — the debrief card.

  A flight ends and, until now, the only thing that happened was a Restart
  button appearing. Everything the flight was judged by — how fast it was
  descending, how far it drifted, how far off vertical it was — was compared
  with three constants inside `checkIfCrash` and then thrown away, along with
  the peaks the recorder had been keeping for plots almost nobody opens.

  This is that, shown, in the lower third's language: condensed uppercase
  labels, the numeral carrying the value, colour only where something is near a
  limit or past it. The model is `$hud/debrief` and is pure; this file decides
  only how many digits and what colour.
-->
<script lang="ts">
  import type { Debrief, Judged } from '$hud/debrief';
  import { CAUTION_FRACTION } from '$hud/metrics';

  interface Props {
    card: Debrief | null;
    onRestart: () => void;
    onBlackBox: () => void;
    onClose: () => void;
  }

  const { card, onRestart, onBlackBox, onClose }: Props = $props();

  /**
   * nominal / caution / alarm, the same three words the gauges use.
   *
   * Read from `CAUTION_FRACTION` rather than a fresh 0.8 so the card and the
   * dials warn at the same moment. A figure that ENDED the flight is alarm
   * whatever its fraction says, because "0.98 of the limit" and "this is why
   * you are looking at this card" are different claims.
   */
  const level = (j: Judged): string =>
    j.exceeded || j.fraction >= 1 ? 'alarm' : j.fraction >= CAUTION_FRACTION ? 'caution' : 'nominal';

  const fixed = (v: number, places: number): string => v.toFixed(places);
  /** Degrees, because nobody reads an attitude in radians. */
  const degrees = (rad: number): string => ((rad * 180) / Math.PI).toFixed(1);
  /** m under a kilometre, km above it — the readout bar's own rule. */
  const distance = (m: number): string =>
    Math.abs(m) < 1_000 ? `${m.toFixed(0)} M` : `${(m / 1_000).toFixed(2)} KM`;
  const clock = (seconds: number): string => {
    const whole = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  };
</script>

{#if card}
  <div class="card" role="dialog" aria-label="Flight debrief" data-debrief data-testid="debrief">
    <div class="head">
      <span class="outcome" data-debrief-outcome data-testid="debrief-outcome">{card.outcome}</span>
      {#if card.reasons.length > 0}
        <span class="why" data-debrief-reason data-testid="debrief-reason">{card.reasons.join(' · ')}</span>
      {/if}
    </div>

    <div class="grid">
      {#if card.touchedDown}
      <div class="cell {level(card.vertical)}" data-debrief-figure="vertical" data-testid="debrief-vertical">
        <span class="label">Descent</span>
        <span class="value">{fixed(Math.abs(card.vertical.value), 1)}<i>m/s</i></span>
        <span class="of">of {fixed(card.vertical.limit, 0)}</span>
      </div>
      <div class="cell {level(card.horizontal)}" data-debrief-figure="horizontal" data-testid="debrief-horizontal">
        <span class="label">Drift</span>
        <span class="value">{fixed(Math.abs(card.horizontal.value), 2)}<i>m/s</i></span>
        <span class="of">of {fixed(card.horizontal.limit, 0)}</span>
      </div>
      <div class="cell {level(card.attitude)}" data-debrief-figure="attitude" data-testid="debrief-attitude">
        <span class="label">Pitch</span>
        <span class="value">{degrees(Math.abs(card.attitude.value))}<i>deg</i></span>
        <span class="of">of {degrees(card.attitude.limit)}</span>
      </div>
      <div class="cell" data-debrief-figure="miss" data-testid="debrief-miss">
        <span class="label">Miss</span>
        <span class="value">{distance(Math.abs(card.miss.value))}</span>
        <span class="of">{card.miss.value < 0 ? 'short' : 'long'}</span>
      </div>
      {/if}

      <div class="cell" data-debrief-figure="elapsed" data-testid="debrief-elapsed">
        <span class="label">Time</span>
        <span class="value">{clock(card.elapsed)}</span>
        <span class="of">mm:ss</span>
      </div>
      <div class="cell {level(card.peakQ)}" data-debrief-figure="peakQ" data-testid="debrief-peak-q">
        <span class="label">Peak Q</span>
        <span class="value">{fixed(card.peakQ.value, 1)}<i>kPa</i></span>
        <span class="of">of {fixed(card.peakQ.limit, 0)}</span>
      </div>
      <div class="cell {level(card.peakHeat)}" data-debrief-figure="peakHeat" data-testid="debrief-peak-heat">
        <span class="label">Peak heat</span>
        <span class="value">{fixed(card.peakHeat.fraction * 100, 0)}<i>%</i></span>
        <span class="of">of limit</span>
      </div>
      <div class="cell {level(card.peakG)}" data-debrief-figure="peakG" data-testid="debrief-peak-g">
        <span class="label">Peak G</span>
        <span class="value">{fixed(card.peakG.value, 1)}<i>g</i></span>
        <span class="of">of {fixed(card.peakG.limit, 0)}</span>
      </div>
      <div class="cell" data-debrief-figure="propellant" data-testid="debrief-propellant">
        <span class="label">Propellant</span>
        <span class="value">{fixed(card.propellant.value, 0)}<i>t</i></span>
        <span class="of">left</span>
      </div>
    </div>

    {#if card.events.length > 0}
      <ol class="events" data-debrief-events data-testid="debrief-events">
        {#each card.events as event (event.id)}
          <li><span class="at">{clock(event.at)}</span>{event.id}</li>
        {/each}
      </ol>
    {/if}

    <!--
      EVERY BUTTON IN ONE ROW, at the bottom. Close used to sit in the head, and
      on a landscape phone the head is level with the top bar — so the card's
      Close landed on `cinematic-toggle` and took its taps. The head carries no
      interactive element now, which is what lets the whole card above this row
      pass pointer events through to the flight.
    -->
    <div class="actions">
      <button type="button" data-debrief-control="restart" data-testid="debrief-restart" onclick={onRestart}>Fly again</button>
      <button type="button" data-debrief-control="black-box" data-testid="debrief-black-box" onclick={onBlackBox}>Black Box</button>
      <button type="button" data-debrief-control="close" data-testid="debrief-close" onclick={onClose}>Close</button>
    </div>
  </div>
{/if}

<style>
  /*
    Over the world, not instead of it. The Black Box takes the whole screen
    because reading a flight back is its own activity; this is the last beat of
    the flight, so the wreck or the landed ship stays visible behind it.
  */
  .card {
    position: fixed;
    left: 50%;
    bottom: calc(var(--safe-bottom) + 5rem);
    transform: translateX(-50%);
    /*
      NO z-index, and that is the fix rather than the omission. It had `4`, the
      only one in the application: every other overlay is a fixed sibling at
      body level ordered by source, and the card is rendered before the Black
      Box, the menu and the guide precisely so they cover it. With a stacking
      index it painted OVER the full-screen Black Box its own button opens, and
      swallowed the clicks meant for the plots underneath.

    */
    width: min(38rem, calc(100vw - 2 * var(--gutter)));
    /*
      TALL ENOUGH TO SHOW ITS BUTTONS, which the first version was not.

      It was `min(70vh, 40rem)` with the offset below, and on a landscape phone
      — 390 CSS pixels of height, of which 70% is 273 — the card scrolled, the
      grid filled it, and "Fly again" and "Black Box" were below the fold with
      nothing to say they were there. Captured on `iphone-landscape` before this
      comment existed: eleven figures visible, no actions, no events.

      So the height is what is actually left after the offsets rather than a
      fraction of the screen, and the card has to FIT inside it — see the
      pointer-events note below for why it cannot simply scroll.
    */
    max-height: min(
      40rem,
      calc(100dvh - var(--safe-top) - var(--safe-bottom) - 6.5rem)
    );
    overflow: hidden;
    /*
      IT NEVER TAKES A TAP IT DOES NOT NEED, and on a landscape phone that is
      the difference between a summary and a wall.

      390 CSS pixels of height and 844 of width: a card wide enough to read
      covers the top bar, the engine rail and the yoke rail at once, and the
      first five-project run said so — ten tests failed with
      `<div data-testid="debrief"> intercepts pointer events` on `all-raptors`,
      `cinematic-toggle` and the old `restart`. There is no arrangement of a
      floating card on that screen that clears them.

      So the card is transparent to the pointer and only its BUTTONS are not.
      Everything above the action row is a readout, and a readout has no
      business swallowing a tap meant for a rocket. Combined with the
      capture-phase dismissal in `App.svelte`, one touch on a control both
      clears the card and works the control.

      The cost is that it cannot be scrolled by touch, so it has to FIT: hence
      `overflow: hidden` here, the event list dropped on short screens below,
      and `toBeInViewport` on the outcome and all three buttons in the e2e, on
      every project.
    */
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.9rem 1rem 1rem;
    border: var(--hairline);
    border-radius: var(--radius);
    background: rgb(6 8 12 / 88%);
    backdrop-filter: blur(14px);
    color: var(--ink-100);
    font-family: var(--font);
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding-bottom: 0.6rem;
    border-bottom: var(--hairline);
  }
  .outcome {
    font-family: var(--font-condensed);
    font-size: 1.4rem;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
  }
  .why {
    flex: 1 1 auto;
    color: var(--ink-70);
    font-size: var(--size-label);
    letter-spacing: var(--track-label-tight);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: 0.6rem 0.9rem;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .label {
    color: var(--ink-45);
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
  }
  .value {
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
  }
  .value i {
    margin-left: 0.2rem;
    color: var(--ink-45);
    font-size: var(--size-label);
    font-style: normal;
  }
  .of {
    color: var(--ink-45);
    font-size: var(--size-label);
    letter-spacing: var(--track-label-tight);
  }
  /* Colour only where it means something — the palette rule of the whole UI. */
  .cell.caution .value {
    color: var(--caution);
  }
  .cell.alarm .value {
    color: var(--alarm);
  }
  .events {
    margin: 0;
    padding: 0.6rem 0 0;
    border-top: var(--hairline);
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.9rem;
    color: var(--ink-70);
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
  }
  .events .at {
    margin-right: 0.35rem;
    color: var(--ink-45);
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    pointer-events: auto;
    margin: 0 -1rem -1rem;
    padding-top: 0.6rem;
    border-top: var(--hairline);
  }
  button {
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.4rem 0.8rem;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    background: rgb(255 255 255 / 4%);
    cursor: pointer;
    touch-action: manipulation;
  }
  button:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }

  /*
    On a short screen there is no room to float above the lower third, so the
    card sits on the bottom edge — the same move M6.6 makes for the control
    panels — and the EVENT LIST goes.

    Dropping it is not an arbitrary trim. The card cannot scroll (it is
    transparent to the pointer, so there is nothing to drag), which means
    everything on it has to fit; and of the three blocks, the events are the one
    the player can already read, in order, in the timeline strip the HUD draws
    across the bottom of every frame. The nine figures and the three buttons
    exist nowhere else.
  */
  @media (max-height: 32rem) {
    .card {
      bottom: calc(var(--safe-bottom) + 0.5rem);
      max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom) - 1rem);
    }
    .events {
      display: none;
    }
  }
</style>
