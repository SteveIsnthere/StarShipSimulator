/**
 * The debrief, in a player's words: what each figure is called, how it is
 * formatted, and how close it came to its limit.
 *
 * Pure, so the card's copy is testable without rendering it. The model
 * (`$hud/debrief`) holds every figure in SI against the limit it was judged
 * by; this decides only the words, the digits and the level.
 *
 * Deliberately absent: a grade and a comparison with the previous attempt
 * (docs/design/ia.md lists both). The model carries neither, and a card that
 * invents a verdict the simulation never made is worse than one that omits it.
 * Phase 9 (UX) adds grading to the model; the card shows it when it exists.
 */
import { LIMIT_STATES, limitState } from '$hud/metrics';
import { formatClock, formatRange } from '$hud/readouts';
import type { Debrief, Judged, Outcome } from '$hud/debrief';
import type { EventId } from '$hud/timeline';
import { rad, toDeg } from '$core/units';

export type Level = (typeof LIMIT_STATES)[number];

/**
 * Nominal, caution or alarm — the gauges' three words, at the gauges'
 * thresholds (`CAUTION_FRACTION`), so the card and the dials warn together.
 * A figure that ENDED the flight is alarm whatever its fraction says.
 */
export function level(j: Judged): Level {
  if (j.exceeded) return 'alarm';
  return LIMIT_STATES[limitState(j.fraction, 1)] ?? 'nominal';
}

/**
 * The word that carries the level, because colour never carries it alone
 * (design-system.md §2.9). It reads into the note beside it: "Over" + "limit
 * 10". Nominal says nothing: inside the limit is the expected case.
 */
export function levelWord(j: Judged): string | null {
  const l = level(j);
  if (l === 'alarm') return j.exceeded || j.fraction > 1 ? 'Over' : 'At';
  if (l === 'caution') return 'Near';
  return null;
}

/** The heading: what happened, in one or two words. */
export const OUTCOME_HEADING: Readonly<Record<Outcome, string>> = {
  TOUCHDOWN: 'Landed',
  CAUGHT: 'Caught',
  CRASH: 'Crashed',
  LOSS: 'Broke up',
  FLYING: 'Still flying',
};

/** The timeline's ids, as a player would say them. */
export const EVENT_LABEL: Readonly<Record<EventId, string>> = {
  ATTACHED: 'Attached stack',
  STAGING: 'Staging',
  SEPARATION: 'Separated',
  BOOSTBACK: 'Boostback burn',
  'ENTRY BURN': 'Entry burn',
  CAUGHT: 'Tower catch',
  LIFTOFF: 'Liftoff',
  'MAX-Q': 'Max Q',
  MECO: 'Engine cutoff',
  APOGEE: 'Highest point',
  DEORBIT: 'Deorbit burn',
  ENTRY: 'Entry',
  FLIP: 'Flip',
  'LANDING BURN': 'Landing burn',
  TOUCHDOWN: 'Touchdown',
  LOSS: 'Vehicle lost',
};

/** The model's clauses ("descending too fast") as one sentence. */
export function reasonSentence(reasons: readonly string[]): string {
  const joined = reasons.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** One cell of the card. */
export interface Figure {
  /** The data-testid, from DEBRIEF_TESTIDS. */
  readonly testid: string;
  /** `data-debrief-figure`, the model's own field name. */
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  /** The line under the value: the limit, or what the value means. Empty for none. */
  readonly note: string;
  /** The level word ("Near", read with the note), or null when there is nothing to warn of. */
  readonly word: string | null;
  /** Null for a figure that has no limit to approach. */
  readonly level: Level | null;
}

const judgedFigure = (
  testid: string,
  key: string,
  label: string,
  j: Judged,
  value: string,
  unit: string,
  limit: string,
): Figure => {
  const word = levelWord(j);
  // The note reads on from the word ("Near limit 10"), or stands alone ("Limit 10").
  return { testid, key, label, value, unit, note: `${word ? 'limit' : 'Limit'} ${limit}`, word, level: level(j) };
};

const degrees = (radians: number): number => toDeg(rad(Math.abs(radians)));

/** The miss, honestly: within a vehicle's height is on the pad. */
function missFigure(j: Judged): Figure {
  const { value, unit } = formatRange(Math.abs(j.value));
  const note = j.fraction < 1 ? 'On the pad' : j.value < 0 ? 'Short of the pad' : 'Past the pad';
  return { testid: 'debrief-miss', key: 'miss', label: 'From the pad', value, unit: unit.toLowerCase(), note, word: null, level: null };
}

/**
 * The card's figures, in reading order: the landing first (only when there was
 * a touchdown to judge), then the flight, then the structural peaks.
 */
export function figures(card: Debrief): readonly Figure[] {
  const landing: Figure[] = card.touchedDown
    ? [
        judgedFigure('debrief-vertical', 'vertical', 'Touchdown', card.vertical,
          Math.abs(card.vertical.value).toFixed(1), 'm/s', card.vertical.limit.toFixed(0)),
        judgedFigure('debrief-horizontal', 'horizontal', 'Drift', card.horizontal,
          Math.abs(card.horizontal.value).toFixed(2), 'm/s', card.horizontal.limit.toFixed(0)),
        judgedFigure('debrief-attitude', 'attitude', 'Tilt', card.attitude,
          `${degrees(card.attitude.value).toFixed(1)}°`, '', `${degrees(card.attitude.limit).toFixed(1)}°`),
        missFigure(card.miss),
      ]
    : [];
  const tonnes = card.propellant.value;
  return [
    ...landing,
    { testid: 'debrief-elapsed', key: 'elapsed', label: 'Flight time', value: formatClock(card.elapsed), unit: '',
      note: '', word: null, level: null },
    { testid: 'debrief-propellant', key: 'propellant', label: 'Propellant',
      value: tonnes < 10 ? tonnes.toFixed(1) : tonnes.toFixed(0), unit: 't',
      note: `left of ${card.propellant.limit.toFixed(0)} t`, word: null, level: null },
    judgedFigure('debrief-peak-q', 'peakQ', 'Peak Q', card.peakQ,
      card.peakQ.value.toFixed(1), 'kPa', card.peakQ.limit.toFixed(0)),
    judgedFigure('debrief-peak-heat', 'peakHeat', 'Peak skin temperature', card.peakHeat,
      card.peakHeat.value.toFixed(0), 'K', card.peakHeat.limit.toFixed(0)),
    judgedFigure('debrief-peak-g', 'peakG', 'Peak g', card.peakG,
      card.peakG.value.toFixed(1), 'g', card.peakG.limit.toFixed(0)),
  ];
}
