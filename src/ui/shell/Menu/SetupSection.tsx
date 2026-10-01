/**
 * Flight setup: the editor's eight fields, Clear, and Start flight.
 *
 * Start flight is held back while any field is out of range, and says how many
 * need fixing; each of those fields says why in words. A blank field is never
 * an error: it keeps the current flight's value (`$app/menu` fieldsToPreset).
 */
import type { Ref } from 'react';
import { Button } from '@ui/Button';
import type { EditorFields } from '$app/menu';
import { FIELD_SPECS, fieldErrors } from './fields';
import { SetupField } from './SetupField';

export interface SetupSectionProps {
  fields: EditorFields;
  onFieldsChange: (fields: EditorFields) => void;
  onClear: () => void;
  onStart: () => void;
  startRef?: Ref<HTMLButtonElement>;
}

export function SetupSection({ fields, onFieldsChange, onClear, onStart, startRef }: SetupSectionProps) {
  const errors = fieldErrors(fields);
  const invalid = Object.keys(errors).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {FIELD_SPECS.map((field) => (
          <SetupField
            key={field.key}
            field={field}
            value={fields[field.key]}
            error={errors[field.key] ?? null}
            onChange={(value) => onFieldsChange({ ...fields, [field.key]: value })}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p role="status" className="mr-auto text-[12px] text-ui-danger">
          {invalid > 0 && `Fix ${invalid === 1 ? 'one field' : `${invalid} fields`} to start.`}
        </p>
        <Button type="button" data-testid="menu-clear" onClick={onClear}>
          Clear
        </Button>
        <Button
          ref={startRef}
          type="button"
          variant="primary"
          data-testid="menu-configure"
          disabled={invalid > 0}
          onClick={onStart}
        >
          Start flight
        </Button>
      </div>
    </div>
  );
}
