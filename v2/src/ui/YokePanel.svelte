<!--
  The flight yoke, the autopilot modes, and the utility toggles.

  index.html:92 — the right-hand panel.
-->
<script lang="ts">
  import ControlButton from './ControlButton.svelte';
  import type { Emit } from './controls';

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
</script>

<section class="panel">
  <span class="title">Flight Yoke</span>
  <input
    class="slider"
    type="range"
    aria-label="Pitch"
    data-control="pitch"
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
  <div class="row">
    <ControlButton label="Lift-Off" event={{ type: 'autoTakeOff' }} indicator="autoTakeOff" {emit} />
    <ControlButton label="Boost-Back" event={{ type: 'boostBack' }} indicator="boostBack" {emit} />
  </div>
  <div class="row">
    <ControlButton label="Att-Hold" event={{ type: 'pitchHold' }} indicator="pitchHold" {emit} />
    <ControlButton label="Auto-Land" event={{ type: 'autoLand' }} indicator="autoLand" {emit} />
  </div>

  <span class="title">Utilities</span>
  <div class="row">
    <ControlButton label="Fins" event={{ type: 'fins' }} indicator="fins" {emit} />
    <ControlButton label="RCS" event={{ type: 'rcs' }} indicator="rcs" {emit} />
    <ControlButton label="DumpFuel" event={{ type: 'dumpFuel' }} indicator="dumpFuel" {emit} />
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.3rem;
  }
  .title {
    font: 500 0.68rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
  }
  .slider {
    width: 100%;
    min-width: 9rem;
    accent-color: #0d0;
  }
</style>
