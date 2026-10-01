/** The about view: what this is, what changed in v2, and where the source lives. Ported from InfoView.svelte. */
import { InfoPart } from './InfoPart';

export function AboutContent() {
  return (
    <>
      <InfoPart title="What this is">
        <p className="mb-3 text-ui-fg">
          Starship Simulator is an unofficial fan simulator. It is not made, endorsed or reviewed by
          SpaceX.
        </p>
        <p>
          Version 2 is a rebuild of the 2021 original with the flight model extracted intact: ported
          line by line, then locked behind recorded golden trajectories so it could be refactored
          without drifting. Where the physics has changed, it changed deliberately.
        </p>
      </InfoPart>

      <InfoPart title="What is different in v2">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>A fixed-timestep simulation, so a flight is the same on every device and at every frame rate.</li>
          <li>A pure simulation core with no DOM, no globals and no wall clock, tested in Node.</li>
          <li>Charts load on demand rather than with every page.</li>
          <li>Orbital scenarios, on real planet-centred gravity.</li>
          <li>It runs offline, from your own machine, fetching nothing from anyone else&rsquo;s server.</li>
        </ul>
      </InfoPart>

      <InfoPart title="Source">
        <a
          href="https://github.com/SteveIsnthere/StarShipSimulator"
          rel="noreferrer"
          target="_blank"
          className="text-ui-fg underline decoration-ui-muted underline-offset-2 hover:decoration-ui-fg"
        >
          github.com/SteveIsnthere/StarShipSimulator
        </a>
      </InfoPart>
    </>
  );
}
