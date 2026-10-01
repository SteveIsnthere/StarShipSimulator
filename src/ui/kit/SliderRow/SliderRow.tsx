/**
 * SliderRow — labelled range input with current-value tag.
 *
 * Use directly when you want the standalone slider; or compose with FormRow
 * when you want the consistent form gap/typography.
 */
import type { CSSProperties } from 'react';
import { cn } from '@ui/internal/utils';

const SLIDER_CLASSES = cn(
	// v3: the gradient track fill defines the rail — no track border.
	// The square thumb uses the central foreground and line tokens for contrast.
	'ui-target w-full appearance-none cursor-pointer bg-transparent',
	// Webkit thumb
	'[&::-webkit-slider-thumb]:appearance-none',
	'[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
	'[&::-webkit-slider-thumb]:rounded-ui-control [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ui-line [&::-webkit-slider-thumb]:bg-ui-fg',
	'[&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-100',
	'hover:[&::-webkit-slider-thumb]:h-5 hover:[&::-webkit-slider-thumb]:w-5',
	// Firefox thumb
	'[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
	'[&::-moz-range-thumb]:rounded-ui-control [&::-moz-range-thumb]:bg-ui-fg',
	'[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ui-line',
	'[&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-100',
	'hover:[&::-moz-range-thumb]:h-5 hover:[&::-moz-range-thumb]:w-5',
);

export interface SliderRowProps {
	id?: string;
	list?: string;
	label: string;
	value: number;
	onChange: (v: number) => void;
	min: number;
	max: number;
	step?: number;
	disabled?: boolean;
	format?: (v: number) => string;
	'data-testid'?: string;
	valueTestId?: string;
}

export function SliderRow({
	id,
	list,
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
	disabled,
	format,
	'data-testid': testId,
	valueTestId,
}: SliderRowProps) {
	const range = max - min;
	const pct = range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 0;
	const fillStyle: CSSProperties = {
		background: `linear-gradient(to right, var(--color-ui-fg) ${pct}%, var(--color-ui-line-muted) ${pct}%) center / 100% 2px no-repeat`,
	};
	return (
		<div className="space-y-1 py-1">
			<div className="flex items-center justify-between">
				<span className="text-[11px] text-ui-muted">{label}</span>
				<span className="text-[11px] font-mono tabular-nums text-ui-fg" data-testid={valueTestId}>
					{format ? format(value) : value.toFixed(step < 1 ? 1 : 0)}
				</span>
			</div>
			<input
				id={id}
				list={list}
				aria-label={label}
				aria-valuetext={format?.(value)}
				data-testid={testId}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				disabled={disabled}
				onChange={e => onChange(Number(e.target.value))}
				className={cn(SLIDER_CLASSES, disabled && 'ui-disabled')}
				style={disabled ? undefined : fillStyle}
			/>
		</div>
	);
}
