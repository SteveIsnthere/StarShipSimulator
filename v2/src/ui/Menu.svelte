<!--
  The menu: time warp, the flight editor, and the two switches that are settings
  rather than flight controls.

  This is the one place in v2 where Svelte does the job it is actually for. The
  menu is interaction-driven — it renders when something is typed or clicked and
  never during flight — so reactive state here costs nothing on the frame path.
  index.html:145.
-->
<script lang="ts">
  import { PRESETS, ORBITAL_PRESETS, type ScenarioPreset } from '$core/scenarios';
  import {
    describeTimeSetting,
    EMPTY_FIELDS,
    fieldsFromPreset,
    MAX_TIME_RATE,
    MIN_TIME_RATE,
    type EditorFields,
    type TimeSetting,
  } from './menu';

  interface Props {
    open: boolean;
    time: TimeSetting;
    randomFailure: boolean;
    onClose: () => void;
    onTimeChange: (setting: TimeSetting) => void;
    onConfigure: (fields: EditorFields) => void;
    onToggleRandomFailure: () => void;
  }

  const {
    open,
    time,
    randomFailure,
    onClose,
    onTimeChange,
    onConfigure,
    onToggleRandomFailure,
  }: Props = $props();

  let fields = $state<EditorFields>({ ...EMPTY_FIELDS });

  const usePreset = (preset: ScenarioPreset) => {
    // tools.js:230 — a preset button FILLS the form. It does not fly it. The
    // pilot still presses Configure, which is what makes a preset a starting
    // point you can edit rather than a fixed menu item.
    fields = fieldsFromPreset(preset);
  };

  const clear = () => {
    fields = { ...EMPTY_FIELDS };
  };

  const setRate = (event: Event & { currentTarget: HTMLInputElement }) => {
    onTimeChange({ rate: event.currentTarget.valueAsNumber, speedingUp: time.speedingUp });
  };
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={onClose}></div>

  <div class="menu" role="dialog" aria-label="Menu" data-menu>
    <div class="row">
      <button
        class="control"
        class:is-on={randomFailure}
        type="button"
        data-menu-control="randomFailure"
        onclick={onToggleRandomFailure}
      >
        Random Failure
      </button>
      <button class="control" type="button" data-menu-control="close" onclick={onClose}>
        Close
      </button>
    </div>

    <p class="title">Time Warp</p>
    <div class="row">
      <button
        class="control"
        type="button"
        data-menu-control="timeDirection"
        onclick={() => onTimeChange({ rate: time.rate, speedingUp: !time.speedingUp })}
      >
        {time.speedingUp ? 'Speed Things Up' : 'Slow Things Down'}
      </button>
      <input
        class="slider"
        type="range"
        aria-label="Time warp rate"
        data-menu-control="timeRate"
        min={MIN_TIME_RATE}
        max={MAX_TIME_RATE}
        step="1"
        value={time.rate}
        oninput={setRate}
      />
      <span class="rate" data-menu-readout="timeRate">{describeTimeSetting(time)}</span>
    </div>

    <p class="title">Configure New Flight</p>

    <div class="presets">
      <span class="subtitle">Scenario Presets</span>
      <div class="row">
        {#each PRESETS as preset (preset.id)}
          <button
            class="control"
            type="button"
            data-preset={preset.id}
            title={preset.description}
            onclick={() => usePreset(preset)}
          >
            {preset.name}
          </button>
        {/each}
      </div>

      <!--
        The orbital presets are new in v2 (M2.9). They are separated because
        they need the planet-centered gravity flag to behave as their names
        suggest — with it off they are simply very fast suborbital arcs.
      -->
      <span class="subtitle">Orbital</span>
      <div class="row">
        {#each ORBITAL_PRESETS as preset (preset.id)}
          <button
            class="control"
            type="button"
            data-preset={preset.id}
            title={preset.description}
            onclick={() => usePreset(preset)}
          >
            {preset.name}
          </button>
        {/each}
      </div>
    </div>

    <div class="fields">
      <input type="number" data-field="altitude" placeholder="Altitude (M)" bind:value={fields.altitude} />
      <input type="number" data-field="xPosition" placeholder="X-Position (M)" bind:value={fields.xPosition} />
      <input type="number" data-field="speedX" placeholder="Speed-X (M/S)" bind:value={fields.speedX} />
      <input type="number" data-field="speedY" placeholder="Speed-Y (M/S)" bind:value={fields.speedY} />
      <input type="number" data-field="pitch" placeholder="Pitch (deg)" bind:value={fields.pitch} />
      <input type="number" data-field="propellant" placeholder="Propellant (T)" bind:value={fields.propellant} />
    </div>

    <div class="row">
      <button class="control" type="button" data-menu-control="clear" onclick={clear}>Clear</button>
      <button
        class="control"
        type="button"
        data-menu-control="configure"
        onclick={() => onConfigure(fields)}
      >
        Configure
      </button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 25%);
  }
  .menu {
    position: fixed;
    inset: auto 0 0 0;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 1rem;
    background: rgb(196 196 196 / 92%);
    backdrop-filter: blur(10px);
    font: 500 0.8rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #0b1017;
  }
  .title {
    margin: 0.6rem 0 0;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .subtitle {
    font-size: 0.7rem;
    opacity: 0.7;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    justify-content: center;
  }
  .presets {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.3rem;
    width: min(34rem, 100%);
  }
  .fields input {
    padding: 0.4rem 0.5rem;
    border: 0;
    border-radius: 0.5rem;
    font: inherit;
    background: rgb(255 255 255 / 60%);
  }
  .control {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.4rem 0.6rem;
    font: 600 0.72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #000;
    background: rgb(255 255 255 / 43%);
    box-shadow:
      3px 3px 7px 0 rgb(0 0 0 / 20%),
      -4px -4px 9px 0 rgb(255 255 255 / 55%);
    cursor: pointer;
  }
  .control.is-on {
    color: #0a0;
    background: rgb(255 255 255 / 24%);
  }
  .slider {
    width: 9rem;
    accent-color: #0d0;
  }
  .rate {
    min-width: 3rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
