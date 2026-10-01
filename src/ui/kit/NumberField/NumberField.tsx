/**
 * NumberField — number input with optional suffix, DS token styling.
 */
import { cn } from '@ui/internal/utils';
import { useId } from 'react';
import { FieldStatus, type FieldStatusState } from '@ui/FieldStatus/FieldStatus';

interface SharedNumberFieldProps {
	id?: string;
	placeholder?: string;
	inputClassName?: string;
	min?: number;
	max?: number;
	step?: number;
	suffix?: string;
	disabled?: boolean;
	invalid?: boolean;
	status?: FieldStatusState;
	ariaLabel?: string;
	className?: string;
	'data-testid'?: string;
}

export type NumberFieldProps = SharedNumberFieldProps & (
	| { allowEmpty: true; value: number | undefined; onChange: (v: number | undefined) => void }
	| { allowEmpty?: false; value: number; onChange: (v: number) => void }
);

export function NumberField(props: NumberFieldProps) {
	const {
	id,
	placeholder,
	inputClassName,
	value,
	min,
	max,
	step = 1,
	suffix,
	disabled = false,
	invalid = false,
	status = { kind: 'idle' },
	ariaLabel,
	className,
	'data-testid': testId,
	} = props;
	const generatedId = useId();
	const statusId = `${id ?? testId ?? generatedId}-status`;
	const statusActive = status.kind !== 'idle';
	return (
		<div className={cn('flex flex-col items-end gap-1', className)}>
			<div className="flex items-center gap-1">
				<input
					id={id}
					placeholder={placeholder}
					data-testid={testId}
					aria-label={ariaLabel}
					aria-invalid={invalid || status.kind === 'failed' || undefined}
					aria-describedby={statusActive ? statusId : undefined}
					aria-busy={status.kind === 'pending' || undefined}
					type="number"
					value={value ?? ''}
					onChange={e => {
						if (e.target.value === '' && props.allowEmpty) { props.onChange(undefined); return; }
						const next = Number(e.target.value);
						if (Number.isFinite(next)) props.onChange(next);
					}}
					min={min}
					max={max}
					step={step}
					disabled={disabled}
					className={cn(
						// v3: sunken fill is the input affordance; focus uses a ring
						// (whitelisted), not a recoloured border.
						'ui-text-field w-16 rounded-ui-control border border-ui-line-muted px-1.5 py-1 text-right text-[10px] font-mono tabular-nums',
						'bg-ui-surface-sunken text-ui-fg transition-colors',
						(invalid || status.kind === 'failed') && 'border-ui-danger text-ui-danger',
						disabled && 'ui-disabled',
						'[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
						inputClassName,
					)}
				/>
				{suffix && (
					<span className="text-[9px] text-ui-muted whitespace-nowrap">{suffix}</span>
				)}
			</div>
			<FieldStatus id={statusActive ? statusId : undefined} state={status} />
		</div>
	);
}
