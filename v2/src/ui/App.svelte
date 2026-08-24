<script lang="ts">
  import { VERSION } from '$core/version';
</script>

<main>
  <h1>Starship Simulator</h1>
  <p>v2 rebuild — core {VERSION}</p>
</main>

<style>
  main {
    display: grid;
    place-content: center;
    min-height: 100dvh;
    margin: 0;
    background: #0b1017;
    color: #a7bdd9;
    font-family: ui-monospace, monospace;
    text-align: center;
  }
  h1 {
    font-size: 1.5rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
