import { cn } from '@ui/internal/utils';

export interface MetricStripItem {
	label: string;
	value: string;
	unit?: string;
	tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface MetricStripProps {
	items: MetricStripItem[];
	className?: string;
	itemClassName?: string;
}

const TONE_CLASS: Record<NonNullable<MetricStripItem['tone']>, string> = {
	neutral: 'text-ui-fg',
	success: 'text-ui-success',
	warning: 'text-ui-warning',
	danger: 'text-ui-danger',
};

export function MetricStrip({ items, className, itemClassName }: MetricStripProps) {
	return (
		<div className={cn('grid gap-1.5', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
			{items.map(item => (
				<div key={item.label} className={cn('min-w-0', itemClassName)}>
					<div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ui-dim">{item.label}</div>
					<div className={cn('mt-0.5 truncate font-mono text-[11px] leading-tight tabular-nums', TONE_CLASS[item.tone ?? 'neutral'])}>
						{item.value}
						{item.unit && <span className="ml-0.5 text-[8px] text-ui-dim">{item.unit}</span>}
					</div>
				</div>
			))}
		</div>
	);
}
