<!--
  The menu: scenario select, time warp, the flight editor, and the two switches
  that are settings rather than flight controls.

  This is the one place in v2 where Svelte does the job it is actually for. The
  menu is interaction-driven — it renders when something is typed or clicked and
  never during flight — so reactive state here costs nothing on the frame path.
  index.html:145.

  M6.5 — A FULL-SCREEN CARD, NOT A SHEET FROM THE BOTTOM. The old menu was a
  light grey panel that slid up over the lower third and left the flight
  half-visible behind it, which is a shape that suits neither: too big to be an
  overlay, too small to be a screen. Choosing a scenario is the one moment in
  this game that is not about the flight, so it takes the whole frame.

  AND THE PRESETS SAY WHAT THEY ARE. `ScenarioPreset` has carried a `description`
  and a full set of initial conditions since M1.1, and the menu showed neither —
  the description was a `title` attribute, invisible on a touchscreen and a
  second's hover away everywhere else. A pilot choosing between "Booster Sep"
  and "RTLS" was choosing between two words. Each button now shows its altitude,
  velocity and propellant, which is what the choice actually is.
-->
<script lang="ts">
  import { LAUNCH_PAD, PRESETS, ORBITAL_PRESETS, type ScenarioPreset } from '$core/scenarios';
  import {
    describeTimeSetting,
    EMPTY_FIELDS,
    fieldsFromPreset,
    MAX_TIME_RATE,
    MIN_TIME_RATE,
    type EditorFields,
    type TimeSetting,
  } from './menu';
  import { presetTestId } from './testids';

  interface Props {
    open: boolean;
    time: TimeSetting;
    randomFailure: boolean;
    tiltControl: boolean;
    onClose: () => void;
    onTimeChange: (setting: TimeSetting) => void;
    onConfigure: (fields: EditorFields) => void;
    onToggleRandomFailure: () => void;
    onToggleTiltControl: () => void;
    /** index.html:224 — the About and Help buttons at the foot of the menu. */
    onShowInfo: (view: 'guide' | 'about') => void;
  }

  const {
    open,
    time,
    randomFailure,
    tiltControl,
    onClose,
    onTimeChange,
    onConfigure,
    onToggleRandomFailure,
    onToggleTiltControl,
    onShowInfo,
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

  /**
   * The stat line under a preset's name.
   *
   * Read off the preset rather than written out again, so it cannot drift from
   * what Configure will actually load. Altitude switches unit at a kilometre for
   * the same reason the HUD does: 200 and 80000 side by side are hard to
   * compare, 200 M and 80 KM are not.
   */
  function statsOf(preset: ScenarioPreset): string {
    const altitude =
      preset.altitude < 1000
        ? `${preset.altitude.toFixed(0)} M`
        : `${(preset.altitude / 1000).toFixed(0)} KM`;
    const speed = Math.round(Math.hypot(preset.speedX, preset.speedY));
    return `${altitude} · ${speed} M/S · ${preset.propellant} T`;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={onClose}></div>

  <div class="menu" role="dialog" aria-label="Menu" data-menu data-testid="menu">
    <header class="bar">
      <span class="wordmark">Starship Simulator</span>
      <button
        class="control"
        type="button"
        data-menu-control="close"
        data-testid="menu-close"
        onclick={onClose}
      >
        Close
      </button>
    </header>

    <div class="body">
      <section class="block">
        <h2 class="title">Scenario</h2>
        <!--
          THE PAD IS A SCENARIO AND HAD NO BUTTON (M12.2).

          `LAUNCH_PAD` is what `initBackEnd()` produces with no preset applied —
          the flight the game hands you after the intro lands, full tanks,
          engines off — and it has been reachable only by finishing the demo or
          reloading the page. Every other scenario is one press. First in the
          list because it is where a flight starts.
        -->
        <div class="presets">
          {#each [LAUNCH_PAD, ...PRESETS] as preset (preset.id)}
            <button
              class="preset"
              type="button"
              data-preset={preset.id}
              data-testid={presetTestId(preset.id)}
              title={preset.description}
              onclick={() => usePreset(preset)}
            >
              <span class="preset-name">{preset.name}</span>
              <span class="preset-stats">{statsOf(preset)}</span>
              <span class="preset-note">{preset.description}</span>
            </button>
          {/each}
        </div>

        <!--
          The orbital presets are new in v2 (M2.9). They are listed separately
          because they are not among the five the 2021 game shipped — orbit was
          structurally impossible under its flat-earth gravity, so these had
          nothing to mean there.
        -->
        <h3 class="subtitle">Orbital · new in v2</h3>
        <div class="presets">
          {#each ORBITAL_PRESETS as preset (preset.id)}
            <button
              class="preset"
              type="button"
              data-preset={preset.id}
              data-testid={presetTestId(preset.id)}
              title={preset.description}
              onclick={() => usePreset(preset)}
            >
              <span class="preset-name">{preset.name}</span>
              <span class="preset-stats">{statsOf(preset)}</span>
              <span class="preset-note">{preset.description}</span>
            </button>
          {/each}
        </div>
      </section>

      <section class="block">
        <h2 class="title">Initial conditions</h2>
        <p class="hint">
          A preset fills these in; Configure flies whatever is here. A blank field keeps the
          current flight's value.
        </p>
        <div class="fields">
          <label class="field">
            <span class="field-label">Altitude</span>
            <input
              type="number"
              data-field="altitude"
              data-testid="field-altitude"
              placeholder="M"
              bind:value={fields.altitude}
            />
          </label>
          <label class="field">
            <span class="field-label">X-Position</span>
            <input
              type="number"
              data-field="xPosition"
              data-testid="field-xPosition"
              placeholder="M"
              bind:value={fields.xPosition}
            />
          </label>
          <label class="field">
            <span class="field-label">Speed-X</span>
            <input
              type="number"
              data-field="speedX"
              data-testid="field-speedX"
              placeholder="M/S"
              bind:value={fields.speedX}
            />
          </label>
          <label class="field">
            <span class="field-label">Speed-Y</span>
            <input
              type="number"
              data-field="speedY"
              data-testid="field-speedY"
              placeholder="M/S"
              bind:value={fields.speedY}
            />
          </label>
          <label class="field">
            <span class="field-label">Pitch</span>
            <input
              type="number"
              data-field="pitch"
              data-testid="field-pitch"
              placeholder="DEG"
              bind:value={fields.pitch}
            />
          </label>
          <label class="field">
            <span class="field-label">Propellant</span>
            <input
              type="number"
              data-field="propellant"
              data-testid="field-propellant"
              placeholder="T"
              bind:value={fields.propellant}
            />
          </label>
          <!--
            THE TWO THE SIMULATION HAD AND THE FORM DID NOT (M12.2).

            Wind was wired through every aerodynamic term at M11.1 and left
            reachable only from a test: `landing-burn-headwind` is a golden
            fixture no player could fly. The hour was given a value per scenario
            at M11.4 and never a way to ask for another one.

            Both are BLANK BY DEFAULT, and that is the whole convention: an
            empty box is "as this scenario has it" — calm air, and the hour the
            sun table gives — rather than a zero someone has to know to clear.
          -->
          <label class="field">
            <span class="field-label">Wind</span>
            <input
              type="number"
              data-field="wind"
              data-testid="field-wind"
              placeholder="M/S"
              bind:value={fields.wind}
            />
          </label>
          <label class="field">
            <span class="field-label">Hour</span>
            <input
              type="number"
              data-field="launchHour"
              data-testid="field-launchHour"
              placeholder="LOCAL"
              bind:value={fields.launchHour}
            />
          </label>
        </div>
        <div class="row">
          <button
            class="control"
            type="button"
            data-menu-control="clear"
            data-testid="menu-clear"
            onclick={clear}
          >
            Clear
          </button>
          <button
            class="control primary"
            type="button"
            data-menu-control="configure"
            data-testid="menu-configure"
            onclick={() => onConfigure(fields)}
          >
            Configure &amp; fly
          </button>
        </div>
      </section>

      <section class="block">
        <h2 class="title">Time warp</h2>
        <div class="row">
          <button
            class="control"
            type="button"
            data-menu-control="timeDirection"
            data-testid="menu-time-direction"
            onclick={() => onTimeChange({ rate: time.rate, speedingUp: !time.speedingUp })}
          >
            {time.speedingUp ? 'Speed Things Up' : 'Slow Things Down'}
          </button>
          <input
            class="slider"
            type="range"
            aria-label="Time warp rate"
            data-menu-control="timeRate"
            data-testid="menu-time-rate"
            min={MIN_TIME_RATE}
            max={MAX_TIME_RATE}
            step="1"
            value={time.rate}
            oninput={setRate}
          />
          <span class="rate" data-menu-readout="timeRate" data-testid="menu-time-readout"
            >{describeTimeSetting(time)}</span
          >
        </div>
      </section>

      <section class="block">
        <h2 class="title">Settings</h2>
        <div class="row">
          <button
            class="control"
            class:is-on={randomFailure}
            type="button"
            data-menu-control="randomFailure"
            data-testid="menu-random-failure"
            aria-pressed={randomFailure}
            onclick={onToggleRandomFailure}
          >
            <span class="pip" aria-hidden="true"></span>
            Random Failure
          </button>
          <button
            class="control"
            class:is-on={tiltControl}
            type="button"
            data-menu-control="tiltControl"
            data-testid="menu-tilt-control"
            aria-pressed={tiltControl}
            onclick={onToggleTiltControl}
          >
            <span class="pip" aria-hidden="true"></span>
            Tilt Control
          </button>
        </div>
        <div class="row">
          <button
            class="control"
            type="button"
            data-menu-control="guide"
            data-testid="menu-guide"
            onclick={() => onShowInfo('guide')}
          >
            Guide
          </button>
          <button
            class="control"
            type="button"
            data-menu-control="about"
            data-testid="menu-about"
            onclick={() => onShowInfo('about')}
          >
            About
          </button>
        </div>
      </section>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    /*
      THE ONE STACKING SCALE THIS APPLICATION HAS, written down at M12.4.

      Everything used to be ordered by source alone, which worked until the
      top-right buttons moved into the clock's row: they are earlier in the DOM
      now and needed lifting over the control rails, and lifting them put them
      over this dialog as well — Playwright reported `open-black-box`
      intercepting a click on the menu's own Close.

      So there are three levels and no more. 0 is the world and the controls, 2
      is the top strip's buttons, 3 is a dialog. A dialog covers everything,
      which is what a dialog is.
    */
    z-index: 3;
    inset: 0;
    background: rgb(6 8 12 / 55%);
  }
  .menu {
    position: fixed;
    z-index: 3;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: rgb(6 8 12 / 94%);
    backdrop-filter: blur(14px);
    color: var(--ink-100);
    font-family: var(--font);
    font-size: var(--size-body);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: calc(var(--safe-top) + 0.9rem) calc(var(--safe-right) + var(--gutter)) 0.9rem
      calc(var(--safe-left) + var(--gutter));
    border-bottom: var(--hairline);
  }
  .wordmark {
    font-family: var(--font-condensed);
    font-size: 1rem;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-100);
  }

  .body {
    flex: 1 1 auto;
    overflow-y: auto;
    display: grid;
    gap: 1.6rem;
    padding: 1.2rem calc(var(--safe-right) + var(--gutter)) calc(var(--safe-bottom) + 2rem)
      calc(var(--safe-left) + var(--gutter));
    /* Wide screens get columns rather than one very long ribbon of content. */
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    align-content: start;
  }
  .block {
    display: grid;
    gap: 0.5rem;
    align-content: start;
  }
  .title {
    margin: 0;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    font-weight: 400;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-45);
  }
  .subtitle {
    margin: 0.5rem 0 0;
    font-family: var(--font-condensed);
    font-size: var(--size-label-sm);
    font-weight: 400;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-45);
  }
  .hint {
    margin: 0;
    color: var(--ink-45);
    font-size: var(--size-label);
  }

  /* --- scenario cards ---------------------------------------------------- */

  .presets {
    display: grid;
    gap: 0.35rem;
  }
  .preset {
    display: grid;
    gap: 0.2rem;
    text-align: left;
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.6rem 0.75rem;
    background: rgb(255 255 255 / 4%);
    cursor: pointer;
    touch-action: manipulation;
    min-height: var(--touch);
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease;
  }
  .preset:hover {
    border-color: var(--ink-45);
    background: rgb(255 255 255 / 9%);
  }
  .preset-name {
    font-family: var(--font);
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1;
    color: var(--ink-100);
  }
  .preset-stats {
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label-tight);
    text-transform: uppercase;
    color: var(--ink-70);
    font-variant-numeric: tabular-nums;
  }
  .preset-note {
    font-size: var(--size-label);
    color: var(--ink-45);
  }

  /* --- editor ------------------------------------------------------------ */

  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.4rem;
  }
  .field {
    display: grid;
    gap: 0.2rem;
  }
  .field-label {
    font-family: var(--font-condensed);
    font-size: var(--size-label-sm);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-45);
  }
  .fields input {
    min-height: var(--touch);
    padding: 0.4rem 0.5rem;
    border: var(--hairline);
    border-radius: var(--radius);
    font-family: var(--font);
    font-size: var(--size-body);
    font-variant-numeric: tabular-nums;
    color: var(--ink-100);
    background: rgb(255 255 255 / 6%);
  }
  .fields input::placeholder {
    color: var(--ink-25);
  }

  /* --- controls ---------------------------------------------------------- */

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .control {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: var(--touch);
    appearance: none;
    border: var(--hairline);
    border-radius: var(--radius);
    padding: 0.4rem 0.7rem;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    line-height: 1;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    background: rgb(255 255 255 / 4%);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease;
  }
  .control:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }
  .control.primary {
    border-color: var(--ink-70);
    color: var(--ink-100);
    background: rgb(255 255 255 / 12%);
  }
  .pip {
    flex: none;
    width: 0.4rem;
    height: 0.4rem;
    border: 1px solid var(--ink-45);
    background: transparent;
  }
  /*
    M6.4: the lit state is a fill, not a green word. Same rule as the flight
    controls — nothing in this interface says "on" by recolouring text.
  */
  .control.is-on {
    border-color: var(--ink-70);
    color: var(--ink-100);
    background: rgb(255 255 255 / 14%);
  }
  .control.is-on .pip {
    background: var(--ink-100);
    border-color: var(--ink-100);
  }

  .slider {
    flex: 1 1 9rem;
    min-width: 8rem;
    accent-color: var(--ink-100);
  }
  .rate {
    min-width: 4rem;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-70);
    font-variant-numeric: tabular-nums;
  }
</style>
