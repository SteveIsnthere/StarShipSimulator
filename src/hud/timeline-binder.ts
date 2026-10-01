/**
 * The fourth binder: the mission event track.
 *
 * WHY IT IS ITS OWN BINDER RATHER THAN MORE ENTRIES IN `METRICS`. Every other
 * binder in this directory reads a pure function of SimState. The timeline
 * cannot: its whole job is to remember what has already happened, so it reads a
 * `Timeline` tracker (see timeline.ts for why that memory has to exist). Adding
 * a stateful source to the metric list would have meant either a module-level
 * tracker — which two flights in one page would then share — or threading a
 * tracker parameter through every pure metric to serve two of them.
 *
 * WHY IT CAN BE REBOUND, WHEN NOTHING ELSE CAN. The other binders resolve once
 * and never again, because the elements they write into are rendered once and
 * live for the session. The track is different: the set of dots depends on
 * which scenario is loaded, so Configure genuinely replaces them. Rebinding is
 * an interaction-time operation — it happens when a flight is configured, never
 * during one — and the per-frame path is untouched by it.
 *
 * The diff discipline is unchanged: integers compared, strings built only on
 * change, nothing written that has not moved.
 */
import type { AttributeTarget, TextTarget } from './binder';
import type { EventId, Timeline } from './timeline';

/** Where a dot on the track stands. Written as `data-state`. */
export const NODE_STATES = ['pending', 'reached', 'current'] as const;
export type NodeState = (typeof NODE_STATES)[number];

/** The `data-metric` id for one event's dot. */
export const eventMetricId = (event: EventId): string => `event-${event}`;

/** Shown before anything has happened. The flight has not started. */
export const PRE_FLIGHT = 'PRE-FLIGHT';

export interface TimelineBinder {
  /** Write anything that changed. Call once per frame, after `observe`. */
  update(): void;
  /**
   * Point the binder at a freshly rendered track.
   *
   * Called on mount and whenever the scenario changes — an interaction, never a
   * frame.
   */
  rebind(track: readonly EventId[], resolve: (id: string) => AttributeTarget | null): void;
  readonly lastWriteCount: number;
  readonly totalWrites: number;
  destroy(): void;
}

export interface TimelineBindOptions {
  /** The tracker this binder reports. */
  timeline: Timeline;
  /** The two text nodes of the narration line. */
  resolveText(id: 'now' | 'next'): TextTarget | null;
}

/**
 * What the narration should say, given a track and what has happened.
 *
 * Split out and exported because it is the only part of this file that is a
 * function rather than a write, and it is worth testing on its own — the
 * "what's next" logic is where an off-by-one hides.
 */
export function narrate(
  timeline: Timeline,
  track: readonly EventId[],
): { now: string; next: string } {
  const current = timeline.current;
  const now = current ? current.id : PRE_FLIGHT;

  // The next thing the TRACK expects that has not happened. Not "the event
  // after the current one": a flight can reach events out of the expected
  // order, or reach one that is not on the track at all, and the honest answer
  // to "what next" is still the first outstanding expectation.
  let next = '';
  for (const event of track) {
    if (!timeline.has(event)) {
      next = event;
      break;
    }
  }
  return { now, next };
}

export function createTimelineBinder(options: TimelineBindOptions): TimelineBinder {
  const { timeline } = options;

  let bound: Array<{ event: EventId; el: AttributeTarget | null; last: NodeState | null }> = [];
  let track: readonly EventId[] = [];

  const nowEl = options.resolveText('now');
  const nextEl = options.resolveText('next');
  let lastNow = ' ';
  let lastNext = ' ';

  let lastWriteCount = 0;
  let totalWrites = 0;

  return {
    get lastWriteCount() {
      return lastWriteCount;
    },
    get totalWrites() {
      return totalWrites;
    },

    rebind(nextTrack, resolve): void {
      track = nextTrack;
      bound = nextTrack.map((event) => ({
        event,
        el: resolve(eventMetricId(event)),
        // Null rather than 'pending', so the first update always writes and the
        // freshly rendered dots are never left showing a stale state.
        last: null,
      }));
      lastNow = ' ';
      lastNext = ' ';
    },

    update(): void {
      let writes = 0;
      const current = timeline.current?.id;

      for (let i = 0; i < bound.length; i++) {
        const entry = bound[i]!;
        const state: NodeState = !timeline.has(entry.event)
          ? 'pending'
          : entry.event === current
            ? 'current'
            : 'reached';

        if (state !== entry.last) {
          entry.last = state;
          if (entry.el) {
            entry.el.setAttribute('data-state', state);
            writes += 1;
          }
        }
      }

      const { now, next } = narrate(timeline, track);
      if (now !== lastNow) {
        lastNow = now;
        if (nowEl) {
          nowEl.textContent = now;
          writes += 1;
        }
      }
      if (next !== lastNext) {
        lastNext = next;
        if (nextEl) {
          // An arrow only when there is something to point at.
          nextEl.textContent = next ? `→ ${next}` : '';
          writes += 1;
        }
      }

      lastWriteCount = writes;
      totalWrites += writes;
    },

    destroy(): void {
      bound = [];
      track = [];
    },
  };
}
