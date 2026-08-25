<!--
  The mission event track.

  A thin rail of dots across the lower third: the events the loaded scenario
  expects, dim until reached, lit once observed, with the current one named and
  the next one pointed at. BROADCAST-UI-PLAN § 4 — the element that turns
  telemetry into a story.

  HOW THIS UPDATES WITHOUT REACTIVE STATE. An event fires a handful of times in
  a whole flight, which makes it tempting to make it `$state` and let Svelte
  render. That would still put framework work on the per-frame path, because the
  CHECK runs every frame even though the answer changes seven times — and the
  law from M4.1 is that nothing framework-shaped runs inside a frame.

  So the dots are rendered once per scenario (which changes on Configure, an
  interaction) and their lit state is written by the timeline binder as a
  `data-state` attribute, exactly like the engine dots. The one thing that IS
  reactive is the track itself, and when it changes the component hands the new
  nodes back so the binder can re-resolve — again, at interaction time.
-->
<script lang="ts">
  import { trackFor, type EventId } from '$hud/timeline';
  import { eventMetricId } from '$hud/timeline-binder';
  import type { AttributeTarget, TextTarget } from '$hud/binder';

  interface Props {
    /** The loaded scenario's id. Changes only when a flight is configured. */
    scenario: string;
    /**
     * Called after every render of the track, with the events it drew and a
     * resolver over the dots. The binder rebinds; nothing here writes.
     */
    onready: (
      track: readonly EventId[],
      resolve: (id: string) => AttributeTarget | null,
      text: (id: 'now' | 'next') => TextTarget | null,
    ) => void;
  }

  const { scenario, onready }: Props = $props();

  const track = $derived<readonly EventId[]>(trackFor(scenario));

  let root: HTMLElement | undefined = $state();
  let nowEl: HTMLElement | undefined = $state();
  let nextEl: HTMLElement | undefined = $state();

  /*
    Runs on mount and again whenever `track` changes — that is, when a flight is
    configured. Reading `track` is what subscribes the effect to it.
  */
  $effect(() => {
    const drawn = track;
    const element = root;
    if (!element) return;

    const dots: Record<string, HTMLElement | undefined> = {};
    for (const el of element.querySelectorAll<HTMLElement>('[data-metric]')) {
      const id = el.dataset['metric'];
      if (id) dots[id] = el;
    }

    onready(
      drawn,
      (id) => dots[id] ?? null,
      (id) => (id === 'now' ? (nowEl ?? null) : (nextEl ?? null)),
    );
  });
</script>

<div class="timeline" data-testid="timeline">
  <div class="track" bind:this={root} aria-hidden="true">
    {#each track as event, index (event)}
      <div class="node" data-event={event}>
        <span class="dot" data-metric={eventMetricId(event)} data-state="pending"></span>
        <span class="name">{event}</span>
      </div>
      {#if index < track.length - 1}
        <span class="link"></span>
      {/if}
    {/each}
  </div>

  <!--
    The same information in words: where the flight is and what is next. This
    is what the phone layout shows instead of the rail (M6.6), and it is what a
    screen reader gets — the rail itself is decorative once this exists.
  -->
  <div class="narration" role="status" aria-live="polite">
    <span class="now" data-testid="event-now" bind:this={nowEl}></span>
    <span class="next" data-testid="event-next" bind:this={nextEl}></span>
  </div>
</div>

<style>
  .timeline {
    display: grid;
    gap: 0.3rem;
    width: 100%;
  }
  .track {
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
    width: 100%;
  }
  .node {
    display: grid;
    justify-items: center;
    gap: 0.3rem;
  }
  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: 1px solid var(--ink-25);
    background: transparent;
  }
  .name {
    font-family: var(--font-condensed);
    font-size: var(--size-label-sm);
    letter-spacing: var(--track-label-tight);
    text-transform: uppercase;
    color: var(--ink-25);
    white-space: nowrap;
  }
  /*
    :global for the same reason the engine dots need it — Svelte prunes a scoped
    selector it cannot statically prove anything matches, and every dot is
    rendered as `pending`. The other two states arrive from the binder at
    runtime. `.track` keeps the escape hatch inside this component.
  */
  .track :global([data-state='reached']) {
    background: var(--ink-70);
    border-color: var(--ink-70);
  }
  .track :global([data-state='current']) {
    background: var(--ink-100);
    border-color: var(--ink-100);
    box-shadow: 0 0 0 3px rgb(255 255 255 / 18%);
  }
  /*
    The whole tail goes inside :global(), not just the attribute part. Svelte
    allows :global at the start or end of a sequence and rejects it in the
    middle, so `:global([data-state]) ~ .name` is a compile error where
    `:global([data-state] ~ .name)` is fine — and matches the same elements,
    since `.name` is a real class on them.
  */
  .track :global([data-state='reached'] ~ .name),
  .track :global([data-state='current'] ~ .name) {
    color: var(--ink-70);
  }

  .link {
    flex: 1 1 auto;
    min-width: 0.6rem;
    height: 1px;
    margin-top: 0.25rem;
    background: var(--ink-12);
  }

  .narration {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }
  .now {
    font-family: var(--font);
    font-weight: 700;
    font-size: var(--size-body);
    letter-spacing: var(--track-label-tight);
    color: var(--ink-100);
  }
  .next {
    font-family: var(--font-condensed);
    font-size: var(--size-label);
    letter-spacing: var(--track-label);
    color: var(--ink-45);
  }
</style>
