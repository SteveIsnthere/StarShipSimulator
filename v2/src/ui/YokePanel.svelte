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
  <div class="row">
    <ControlButton label="Lift-Off" event={{ type: 'autoTakeOff' }} indicator="autoTakeOff" testid="auto-take-off" {emit} />
    <ControlButton label="Boost-Back" event={{ type: 'boostBack' }} indicator="boostBack" testid="boost-back" {emit} />
  </div>
  <div class="row">
    <ControlButton label="Att-Hold" event={{ type: 'pitchHold' }} indicator="pitchHold" testid="pitch-hold" {emit} />
    <ControlButton label="Auto-Land" event={{ type: 'autoLand' }} indicator="autoLand" testid="auto-land" {emit} />
  </div>
  <div class="row">
    <!--
      M2.9(c). The only button here without a 2021 counterpart: there were no
      orbits to come home from. It hands the vehicle to Auto-Land once the
      retrograde burn is done, so the two lights are never on together.
    -->
    <ControlButton label="Deorbit" event={{ type: 'autoDeorbit' }} indicator="autoDeorbit" testid="auto-deorbit" {emit} />
  </div>

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
