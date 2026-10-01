/**
 * One flight setup field: its name and valid range above the box, the sign
 * convention where there is one, the unit as a suffix that does not vanish on
 * typing, and the error in words when the value is out of range.
 *
 * The name, range and convention all sit inside the <label>, so a screen
 * reader hears what a sighted player reads before typing; the hidden commas
 * keep the three from running together into one word.
 */
import { NumberField } from '@ui/NumberField';
import type { FieldSpec } from './fields';

export interface SetupFieldProps {
  field: FieldSpec;
  /** As typed; empty keeps the current flight's value. */
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}

export function SetupField({ field, value, error, onChange }: SetupFieldProps) {
  const id = `menu-field-${field.key}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium text-ui-fg">{field.label}</span>
          <span className="sr-only">,</span>{' '}
          <span className="font-mono text-[11px] text-ui-muted">{field.range}</span>
        </span>
        {field.note && (
          <>
            <span className="sr-only">,</span>{' '}
            <span className="text-[12px] text-ui-muted">{field.note}</span>
          </>
        )}
      </label>
      <NumberField
        allowEmpty
        id={id}
        data-testid={`field-${field.key}`}
        value={value.trim() === '' ? undefined : Number(value)}
        onChange={(next) => onChange(next === undefined ? '' : String(next))}
        min={field.min}
        max={field.max}
        suffix={field.unit}
        placeholder="Current"
        invalid={error !== null}
        status={error === null ? { kind: 'idle' } : { kind: 'failed', message: error }}
        className="items-stretch"
        inputClassName="w-full min-w-0 flex-1 px-2.5 text-left text-[14px]"
      />
    </div>
  );
}
