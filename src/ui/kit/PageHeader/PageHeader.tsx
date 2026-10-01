/**
 * Prop-only page context: brand/back, title/subtitle and destination/action slots.
 * Product adapters supply branded nodes and routing callbacks. The surrounding
 * input scope owns keyboard/gamepad Back; this component imports neither policy.
 */
import { ChevronLeft } from 'lucide-react';
import { cn } from '@ui/internal/utils';

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	brandSlot?: React.ReactNode;
	pagesSlot?: React.ReactNode;
	rightSlot?: React.ReactNode;
	/**
	 * Render a breadcrumb back link above the title.
	 *
	 * `label` is the destination name as displayed (e.g. "Hangar", "Builder").
	 * Use sentence case — the link renders the chevron + label inline. `mark` puts the
	 * brand mark inside the back button, so one control means "back".
	 */
	back?: { label: string; onClick: () => void; mark?: React.ReactNode };
	testId?: string;
	/** Keep brand/back/pages on one row and give the title the full available width. */
	compact?: boolean;
}

export function PageHeader({ title, subtitle, brandSlot, pagesSlot, rightSlot, back, testId, compact = false }: PageHeaderProps) {
	return (
		<header className={cn('border-b border-ui-line pb-4 text-ui-fg', compact ? 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2' : 'flex flex-wrap items-start gap-4')} data-testid={testId}>
			{brandSlot && <div className="shrink-0">{brandSlot}</div>}
			<div className={compact ? 'contents' : 'min-w-[min(100%,220px)] flex-1'}>
				{back && (
					<button
						type="button"
						onClick={back.onClick}
						className={cn(
							'ui-target group/back -ml-1 mb-1 inline-flex items-center gap-1.5 rounded-ui-control px-1 py-0.5',
							'text-[13px] font-medium text-ui-muted',
							'border border-transparent transition-colors hover:border-ui-line hover:text-ui-fg',
							compact && (brandSlot ? 'col-start-2' : 'col-span-2 col-start-1'),
							compact && 'row-start-1 justify-self-start mb-0',
						)}
						aria-label={`Back to ${back.label}`}
						data-testid="page-header-back"
					>
						<ChevronLeft size={16} strokeWidth={2} aria-hidden="true" className="-ml-0.5 transition-transform group-hover/back:-translate-x-0.5" />
						{back.mark && <span className="inline-flex shrink-0" aria-hidden="true">{back.mark}</span>}
						<span>{back.label}</span>
					</button>
				)}
				<h1 className={cn('font-tight text-2xl font-semibold tracking-tight sm:text-3xl', compact && 'col-span-3 row-start-2')}>{title}</h1>
				{subtitle && <p className={cn('mt-1 text-sm text-ui-muted', compact && 'col-span-3 row-start-3 mt-0')}>{subtitle}</p>}
			</div>
			{compact ? <>
				{pagesSlot && <div className="col-start-3 row-start-1 justify-self-end">{pagesSlot}</div>}
				{rightSlot && <div className="col-span-3 flex flex-wrap gap-2">{rightSlot}</div>}
			</> : (pagesSlot || rightSlot) && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{pagesSlot}{rightSlot}</div>}
		</header>
	);
}
