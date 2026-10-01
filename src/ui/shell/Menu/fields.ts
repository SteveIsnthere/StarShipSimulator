/**
 * The flight setup's fields: what each is called in a player's words, its
 * unit, the range it accepts, and the error a value outside it earns.
 *
 * The parsing rules (blank keeps the current flight's value) are `$app/menu`'s
 * and are not restated here; this file only says which typed values are
 * flyable. Two bounds are read off the simulation rather than written out: the
 * tanks' capacity, and half a lap of the planet, which is the farthest a point
 * on the ground track can be from the pad (the Deorbit Burn preset starts
 * exactly there, so a round 20 000 km would reject a shipped scenario).
 */
import type { EditorFields } from '$app/menu';
import { planetRadius } from '$core/constants';
import { PROPELLANT_CAPACITY } from '$core/physics/mass';

export type FieldKey = Exclude<keyof EditorFields, 'basedOn'>;

export interface FieldSpec {
  readonly key: FieldKey;
  readonly label: string;
  /** The suffix that stays beside the value. */
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  /** The valid range, as the field shows it. */
  readonly range: string;
  /** The sign convention, where a sign means something. */
  readonly note?: string;
  /** What an out-of-range value is told. */
  readonly error: string;
}

/** m — half a lap of ground track, rounded out to the metre. */
const HALF_LAP = Math.ceil(Math.PI * planetRadius);

const MINUS = '−';
const THIN = ' ';

/** 20015 -> "20 015", with a real minus sign. */
function figure(n: number): string {
  const digits = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 }).replace(/,/g, THIN);
  return n < 0 ? `${MINUS}${digits}` : digits;
}

function spanOf(min: number, max: number, unit: string): string {
  return unit === '°'
    ? `${figure(min)}° to ${figure(max)}°`
    : `${figure(min)} to ${figure(max)} ${unit}`;
}

function spec(
  key: FieldKey,
  label: string,
  unit: string,
  min: number,
  max: number,
  note?: string,
): FieldSpec {
  const range = spanOf(min, max, unit);
  return {
    key,
    label,
    unit,
    min,
    max,
    range,
    error: `${label} must be ${range}.`,
    ...(note === undefined ? {} : { note }),
  };
}

const farthest = `${figure(HALF_LAP / 1000)} km`;

export const FIELD_SPECS: readonly FieldSpec[] = [
  spec('altitude', 'Altitude', 'm', 0, 400_000),
  {
    key: 'xPosition',
    label: 'Distance from the pad',
    unit: 'm',
    min: -HALF_LAP,
    max: HALF_LAP,
    range: `Up to ${farthest} either side`,
    note: 'Negative is short of the pad',
    error: `Distance from the pad must be within ${farthest} either side.`,
  },
  spec('speedX', 'Horizontal speed', 'm/s', -8000, 8000, 'Positive is downrange'),
  spec('speedY', 'Vertical speed', 'm/s', -3000, 3000, 'Negative is falling'),
  spec('pitch', 'Pitch', '°', -180, 180, '0° is upright, 90° is level'),
  spec('propellant', 'Propellant', 't', 0, PROPELLANT_CAPACITY / 1000),
  spec('wind', 'Wind', 'm/s', -60, 60, 'Positive blows downrange'),
  spec('launchHour', 'Time of day', 'h', 0, 24, 'Local solar time'),
];

/** The error for one typed value, or null. Blank is never an error: it keeps the current value. */
export function fieldError(field: FieldSpec, raw: string): string | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${field.label} must be a number.`;
  return value < field.min || value > field.max ? field.error : null;
}

/** Every field's error, keyed by field; empty when the form is flyable. */
export function fieldErrors(fields: EditorFields): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  for (const field of FIELD_SPECS) {
    const error = fieldError(field, fields[field.key]);
    if (error !== null) errors[field.key] = error;
  }
  return errors;
}
