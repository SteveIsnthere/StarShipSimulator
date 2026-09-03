<!--
  The guide and the about screen. index.html:248 and :330.

  The keybind list is GENERATED from the binding table in app/input.ts rather
  than written out again. 2021's guide was prose, maintained by hand alongside
  eventListener.js, and the two had already drifted: the guide says "+ or -" to
  zoom where the code binds "=" and "-", and it says A pitches down where the
  code sends -100. A help screen that can lie is worse than no help screen, so
  this one cannot: if a binding changes, this list changes with it, and a test
  asserts every documented key still resolves.
-->
<script lang="ts">
  import { KEY_BINDINGS } from '$app/input';

  interface Props {
    view: 'guide' | 'about' | null;
    onClose: () => void;
  }

  const { view, onClose }: Props = $props();
</script>

{#if view}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={onClose}></div>

  <div class="sheet" role="dialog" aria-label={view === 'guide' ? 'Guide' : 'About'} data-info={view} data-testid="info-view">
    <div class="bar">
      <span>{view === 'guide' ? 'Guide' : 'About'}</span>
      <button type="button" data-info-control="close" data-testid="info-close" onclick={onClose}>Close</button>
    </div>

    {#if view === 'guide'}
      <details open>
        <summary>Basics</summary>
        <p>Touch or mouse. The keyboard is not a necessity; it just makes things easier.</p>
        <ul>
          <li><b>Flight yoke</b> (right): the slider pitches the nose. Below it, the autopilot modes, then the fin, RCS and fuel-dump switches.</li>
          <li><b>Engine controls</b> (left): the slider sets thrust; the buttons above it are the three Raptors and a toggle-all.</li>
          <li><b>Thrust Safe Guard</b> holds the throttle at whatever keeps the vehicle within its dynamic-pressure limit.</li>
        </ul>
      </details>

      <details>
        <summary>Keybinds</summary>
        <table>
          <tbody>
            {#each KEY_BINDINGS as binding (binding.does)}
              <tr>
                <td class="keys">
                  {#each binding.keys as key, i (key)}<kbd>{key}</kbd>{#if i < binding.keys.length - 1}<span class="or">/</span>{/if}{/each}
                </td>
                <td>{binding.does}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </details>

      <details>
        <summary>Autopilot modes</summary>
        <ul>
          <li><b>Lift-Off</b> — ascent on a pitch programme by altitude, 55&deg; at 25 km and 85&deg; at 80 km.</li>
          <li><b>Boost-Back</b> — kills downrange velocity and points the vehicle home.</li>
          <li><b>Att-Hold</b> — holds the attitude you let go of the yoke at.</li>
          <li><b>Auto-Land</b> — the full sequence: aero descent, flip, horizontal null, final burn.</li>
          <li>
            <b>Deorbit</b> — new in v2. Holds retrograde, times a burn so the descent ends at
            StarBase, and hands over to Auto-Land. Try it from the Deorbit or Circularize preset.
          </li>
        </ul>
      </details>

      <details>
        <summary>If you have played Kerbal Space Program before…</summary>
        <p>Then basically you are good to play, the keybinds are the same. Have fun. :)</p>
      </details>
    {:else}
      <details open>
        <summary>Version</summary>
        <p>v2 — a rebuild of the 2021 original, with the flight model extracted intact.</p>
        <p>
          The physics is the same physics: ported line by line, then locked behind golden
          trajectory fixtures so it could be refactored without drifting. Where it has changed,
          it changed deliberately, under a declared tier, with the before and after in the commit.
        </p>
      </details>

      <details>
        <summary>What's different</summary>
        <ul>
          <li>Fixed-timestep simulation, so the flight is the same on every device and at every frame rate.</li>
          <li>Pure simulation core with no DOM, no globals and no wall-clock — testable in Node.</li>
          <li>Charts load on demand instead of 3.5&nbsp;MB of Plotly on every page load.</li>
          <li>Orbital scenarios, on real planet-centered gravity.</li>
          <li>Runs offline, from your own machine, with nothing fetched from anyone else's server.</li>
        </ul>
      </details>

      <details>
        <summary>Source</summary>
        <p>
          <a href="https://github.com/SteveIsnthere/StarShipSimulator" rel="noreferrer">
            github.com/SteveIsnthere/StarShipSimulator
          </a>
        </p>
      </details>
    {/if}
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
  /*
    M6.5: the guide is a document, and the typography pass treats it as one.
    It was 0.85rem system-UI on a mid-grey sheet with 1.5 line height and no
    measure limit, so on a wide screen a paragraph ran the full width of the
    display. Prose wants a column.
  */
  .sheet {
    position: fixed;
    z-index: 3;
    inset: 0;
    overflow-y: auto;
    padding: calc(var(--safe-top) + 0.9rem) calc(var(--safe-right) + var(--gutter))
      calc(var(--safe-bottom) + 2rem) calc(var(--safe-left) + var(--gutter));
    background: rgb(6 8 12 / 96%);
    backdrop-filter: blur(14px);
    color: var(--ink-70);
    font-family: var(--font);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    max-width: 44rem;
    margin: 0 auto 1.2rem;
    padding-bottom: 0.9rem;
    border-bottom: var(--hairline);
  }
  .bar span {
    font-family: var(--font-condensed);
    font-size: 1rem;
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-100);
  }
  .bar button {
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
  }
  .bar button:hover {
    border-color: var(--ink-45);
    color: var(--ink-100);
  }

  /* Prose gets a measure. Everything below the bar sits in one column. */
  .sheet :global(details) {
    max-width: 44rem;
    margin: 0 auto;
    border-bottom: 1px solid var(--ink-12);
  }
  summary {
    cursor: pointer;
    padding: 0.7rem 0;
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    text-transform: uppercase;
    color: var(--ink-100);
    min-height: var(--touch);
    display: flex;
    align-items: center;
  }
  ul {
    margin: 0.25rem 0 1rem;
    padding-left: 1.1rem;
  }
  li {
    margin-bottom: 0.4rem;
  }
  p {
    margin: 0.25rem 0 1rem;
  }
  table {
    border-collapse: collapse;
    margin-bottom: 1rem;
    width: 100%;
  }
  td {
    padding: 0.3rem 0.6rem 0.3rem 0;
    vertical-align: top;
    border-bottom: 1px solid var(--ink-12);
  }
  .keys {
    white-space: nowrap;
    width: 1%;
  }
  kbd {
    display: inline-block;
    min-width: 1.5rem;
    padding: 0.15rem 0.4rem;
    border: var(--hairline);
    border-radius: var(--radius);
    background: rgb(255 255 255 / 6%);
    font-family: var(--font-condensed);
    font-size: 0.75rem;
    letter-spacing: var(--track-label-tight);
    text-align: center;
    color: var(--ink-100);
  }
  .or {
    padding: 0 0.25rem;
    color: var(--ink-25);
  }
  a {
    color: var(--ink-100);
    text-decoration-color: var(--ink-45);
    text-underline-offset: 0.15em;
  }
</style>
