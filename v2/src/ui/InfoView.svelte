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
    inset: 0;
    background: rgb(0 0 0 / 45%);
  }
  .sheet {
    position: fixed;
    inset: 8% 5% 8% 5%;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 0.75rem;
    background: rgb(46 46 46 / 97%);
    color: whitesmoke;
    font:
      400 0.85rem/1.5 -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin-bottom: 0.75rem;
  }
  .bar button {
    appearance: none;
    border: 0;
    border-radius: 0.55rem;
    padding: 0.4rem 0.6rem;
    font: inherit;
    cursor: pointer;
  }
  summary {
    cursor: pointer;
    padding: 0.4rem 0;
    font-weight: 600;
  }
  ul {
    margin: 0.25rem 0 0.75rem;
    padding-left: 1.2rem;
  }
  li {
    margin-bottom: 0.25rem;
  }
  p {
    margin: 0.25rem 0 0.75rem;
    opacity: 0.9;
  }
  table {
    border-collapse: collapse;
    margin-bottom: 0.75rem;
  }
  td {
    padding: 0.2rem 0.6rem 0.2rem 0;
    vertical-align: top;
  }
  .keys {
    white-space: nowrap;
  }
  kbd {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    border-radius: 0.3rem;
    background: rgb(255 255 255 / 15%);
    font: 600 0.75rem/1.4 var(--font);
  }
  .or {
    padding: 0 0.2rem;
    opacity: 0.5;
  }
  a {
    color: #8ec7ff;
  }
</style>
