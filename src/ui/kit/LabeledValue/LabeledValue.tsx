/**
 * LabeledValue — a labeled data cell: small-caps eyebrow on top, value
 * below. Used in metadata grids (mission briefing, debug-panel rows,
 * builder properties).
 *
 * Replaces the local `BriefingRow` previously declared inside
 * MissionsPage. Renders as a `<div>` by default; pass `as="dl"` and
 * use `<LabeledValue.Label>` / `<LabeledValue.Value>` for semantic
 * `<dt>` / `<dd>` markup inside a definition list.
 *
 * See docs/design/design-system.md §3.3.
 */
import { type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';
import { Eyebrow } from '@ui/Eyebrow';

export interface LabeledValueProps {
	label: string;
	value: ReactNode;
	/** Visual treatment of the cell.
	 *  - `framed` (default): quiet sunken fill cell — v3: NO border
	 *    (design-system.md §2.4); prefer `bare` inside an already-boxed
	 *    parent (one visible box level)
	 *  - `bare`: eyebrow + value only (definition lists, dense panels) */
	variant?: 'framed' | 'bare';
	/** Use JetBrains Mono tabular-nums for the value (numeric data). */
	mono?: boolean;
	/** Override the default test-id on the value element. */
	valueTestId?: string;
	className?: string;
}

export function LabeledValue({
	label,
	value,
	variant = 'framed',
	mono = false,
	valueTestId,
	className,
}: LabeledValueProps) {
	return (
		<div
			className={cn(
				variant === 'framed' && 'rounded-ui-control border border-ui-line-muted bg-ui-surface-sunken px-3 py-2',
				className,
			)}
		>
			<Eyebrow size="sm" tracking="md">{label}</Eyebrow>
			<div
				className={cn(
					'mt-1 truncate text-sm font-medium text-ui-fg',
					mono && 'font-mono tabular-nums',
				)}
				data-testid={valueTestId}
			>
				{value}
			</div>
		</div>
	);
}
