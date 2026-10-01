<!--
  The flight yoke, the autopilot modes, and the utility toggles.

  index.html:92 — the right-hand panel.
-->
<script lang="ts">
  import ControlButton from './ControlButton.svelte';
  import type { Emit } from './controls';
  import { AUTOPILOT_MODES } from './guide';

  interface Props {
    emit: Emit;
  }
  const { emit }: Props = $props();

  /** Read off the event; see EnginePanel for why there is nothing to bind. */
  const onPitch = (event: Event & { currentTarget: HTMLInputElement }) => {
    emit({ type: 'pitch', percent: event.currentTarget.valueAsNumber });
  };

  /**
   * switches.js:2 and :8. Grabbing the yoke suspends attitude hold; releasing it
   * adopts whatever attitude the vehicle now has. The yoke does NOT spring back
   * to centre on release — 2021 left the slider where the pilot let go, and the
   * hold takes over from there.
   */
  const grab = () => emit({ type: 'yokeGrab' });
  const release = () => emit({ type: 'yokeRelease' });

  /**
   * The modes, two to a row — the layout the panel has always had.
   *
   * Chunked here rather than in `guide.ts` because the pairing is a fact about
   * this rail's width and nothing the guide needs to know. An odd count leaves
   * the last row with one button, which is what Deorbit already looked like.
   */
  const rows = AUTOPILOT_MODES.reduce<(typeof AUTOPILOT_MODES)[number][][]>((acc, mode, i) => {
    if (i % 2 === 0) acc.push([mode]);
    else acc[acc.length - 1]!.push(mode);
    return acc;
  }, []);
</script>

<section class="panel">
  <span class="title">Flight Yoke</span>
  <input
    class="slider"
    type="range"
    aria-label="Pitch"
    data-control="pitch"
    data-testid="yoke-pitch"
    min="-100"
    max="100"
    step="1"
    value="0"
    oninput={onPitch}
    onpointerdown={grab}
    onpointerup={release}
    onpointercancel={release}
    onmouseover={grab}
    onmouseout={release}
    onfocus={grab}
    onblur={release}
  />

  <span class="title">Auto Pilot Modes</span>
  <!--
    RENDERED FROM `ui/guide.ts`, in pairs, since M12.6.

    These were five hand-written `ControlButton`s and the guide described them
    in hand-written prose beside them, which is the arrangement `InfoView`'s
    header exists to complain about: two lists that have to agree and nothing
    making them. Now the buttons and the help are the same table, so a mode
    cannot exist in one and not the other.

    Deorbit — M2.9(c) — is the only one without a 2021 counterpart: there were
    no orbits to come home from. It hands the vehicle to Auto-Land once the
    retrograde burn is done, so the two lights are never on together.
  -->
  {#each rows as row, index (index)}
    <div class="row">
      {#each row as mode (mode.testid)}
        <ControlButton
          label={mode.label}
          event={mode.event}
          indicator={mode.indicator}
          testid={mode.testid}
          {emit}
        />
      {/each}
    </div>
  {/each}

  <span class="title">Utilities</span>
  <div class="row">
    <ControlButton label="Fins" event={{ type: 'fins' }} indicator="fins" testid="fins" {emit} />
    <ControlButton label="RCS" event={{ type: 'rcs' }} indicator="rcs" testid="rcs" {emit} />
    <ControlButton label="DumpFuel" event={{ type: 'dumpFuel' }} indicator="dumpFuel" testid="dump-fuel" {emit} />
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.4rem;
  }
  .title {
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-45);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
  }
  /* See EnginePanel for why this is white rather than green. */
  .slider {
    width: 100%;
    min-width: 9rem;
    accent-color: var(--ink-100);
    height: var(--touch);
  }
</style>
