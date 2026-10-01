<!--
  The first thing to press (M12.6).

  WHAT A NEW PLAYER ACTUALLY SEES on arriving: a vehicle flying itself down onto
  a pad, a wall of unlabelled instrument panels, and no indication that any of it
  is theirs to touch. The intro demo is part of the soul and is not going
  anywhere, but it does mean the first twenty seconds show a simulator that
  appears to be busy.

  So: one card, once, saying the two things that get someone flying. It is shown
  only on a profile that has never dismissed it, and ANY input dismisses it —
  the point is to get out of the way of the first thing pressed, not to be the
  first thing pressed.

  POINTER-EVENTS: NONE on the card, with the button opting back in. That is
  M12.1's lesson repeated: Playwright will not dispatch a click into a covered
  element, and a hint that sits over the controls it is describing would block
  exactly the buttons it is pointing at. A player would find the same thing and
  have no error message for it.
-->
<script lang="ts">
  import { MAX_THROTTLE_KEY } from '$app/input';

  interface Props {
    open: boolean;
    onDismiss: () => void;
  }
  const { open, onDismiss }: Props = $props();

  /*
    The key quoted here is imported, not looked up. It is a small thing and it is
    the whole lesson of `InfoView`'s header: 2021's guide said "+ or -" to zoom
    where the code bound "=" and "-". A hint is a help screen with fewer words
    and it can drift the same way — and the first version of this line found the
    binding by matching its prose description, which would have dropped the
    keyboard line silently the day someone reworded it.
  */
</script>

{#if open}
  <div class="hint" data-testid="first-flight-hint" role="note" aria-label="Getting started">
    <p class="lead">It is flying itself</p>
    <p class="body">
      <span><b>All Raptors</b> lights the engines, then push <b>Thrust</b>.</span>
      <span><b>Menu</b> picks another flight.</span>
    </p>
    <p class="keys"><kbd>{MAX_THROTTLE_KEY}</kbd> is full throttle</p>
    <button type="button" data-testid="first-flight-dismiss" onclick={onDismiss}>Got it</button>
  </div>
{/if}

<style>
  .hint {
    /*
      NOT POSITIONED. It is a child of the broadcast column's `hint-slot`, which
      holds it against the lower third — see Broadcast.svelte's `hint` prop.
      This was a fixed card at a measured offset and it sat on the mission
      timeline on all five projects; things in one flex column cannot overlap,
      and a magic number cannot be right on five viewports at once.
    */
    display: flex;
    align-items: center;
    gap: 0.9rem;
    /* See the header: the card must not eat the taps it is describing. */
    pointer-events: none;
    max-width: 42rem;
    padding: 0.5rem 0.7rem;
    border: var(--hairline);
    border-radius: var(--radius);
    background: rgb(6 8 12 / 88%);
    backdrop-filter: blur(10px);
    color: var(--ink-100);
    font-family: var(--font);
    font-size: var(--size-label);
    line-height: 1.35;
  }
  .lead {
    margin: 0;
    font-family: var(--font-condensed);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    white-space: nowrap;
  }
  .body {
    margin: 0;
    min-width: 0;
  }
  .keys {
    margin: 0;
    color: var(--ink-45);
    white-space: nowrap;
  }
  kbd {
    display: inline-block;
    min-width: 1.2rem;
    padding: 0.05rem 0.3rem;
    border: var(--hairline);
    border-radius: 3px;
    font-family: var(--font-condensed);
    text-align: center;
  }
  button {
    pointer-events: auto;
    flex: 0 0 auto;
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.35rem 0.8rem;
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
    What goes as the band narrows, in order. The keyboard line first — a phone
    has no keyboard — then the lead, which is a flourish. The one sentence that
    tells someone what to press is the last thing standing, and the button never
    goes anywhere.

    A landscape phone does not show the hint at all; App.svelte owns that
    decision and carries the measurement behind it.
  */
  @media (width < 52rem), (height < 30rem) {
    .keys {
      display: none;
    }
  }
  @media (width < 34rem) {
    .lead {
      display: none;
    }
  }
</style>
