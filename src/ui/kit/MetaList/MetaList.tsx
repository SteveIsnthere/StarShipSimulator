/**
 * MetaList — inline list of metadata items joined by a `·` separator.
 *
 * Used everywhere a row carries a few short data tokens:
 *
 *   `RWY 36 · 6,562 FT · 080°`                     (StartModeControl caption)
 *   `RWY 36 · 6,562 ft · 080°`                     (FreeFlightMap popup)
 *   `16 of 16 approaches · 3 scored`               (Challenges subtitle)
 *
 * Each item can be a string or a ReactNode. Separators are rendered with
 * `aria-hidden` so screen readers don't speak them.
 *
 * See docs/design/design-system.md §3.3.
 */
import { Fragment, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export interface MetaListProps {
	items: ReactNode[];
	/** Visual treatment of the entire row. `prose` (default) uses body weight;
	 *  `mono` switches to JetBrains Mono with tabular numerics. */
	variant?: 'prose' | 'mono';
	/** Text size. */
	size?: 'sm' | 'md';
	/** Per-item gap. `normal` (default) uses 8px; `tight` uses 6px. */
	gap?: 'tight' | 'normal';
	className?: string;
}

const SIZE_CLASS: Record<NonNullable<MetaListProps['size']>, string> = {
	sm: 'text-[12px]',
	md: 'text-[13px]',
};

export function MetaList({
	items,
	variant = 'prose',
	size = 'md',
	gap = 'normal',
	className,
}: MetaListProps) {
	const visibleItems = items.filter((item): item is ReactNode => item != null && item !== false && item !== '');
	if (visibleItems.length === 0) return null;
	const gapClass = gap === 'tight' ? 'mx-1.5' : 'mx-2';
	return (
		<span
			className={cn(
				'inline-flex flex-wrap items-baseline text-ui-muted',
				variant === 'mono' && 'font-mono tabular-nums tracking-[0.04em]',
				SIZE_CLASS[size],
				className,
			)}
		>
			{visibleItems.map((item, i) => (
				<Fragment key={i}>
					{i > 0 && <span className={cn(gapClass, 'text-ui-dim')} aria-hidden>·</span>}
					<span>{item}</span>
				</Fragment>
			))}
		</span>
	);
}
