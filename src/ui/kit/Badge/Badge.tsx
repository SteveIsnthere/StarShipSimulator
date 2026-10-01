/**
 * Badge — small inline label or count pill.
 * See docs/design/design-system.md for the square label contract.
 */
import { type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
	tone?: BadgeTone;
	className?: string;
	children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
	neutral: 'border-ui-line-muted text-ui-muted',
	accent: 'border-ui-line bg-ui-selected text-ui-on-selected',
	success: 'border-ui-success text-ui-success',
	warning: 'border-ui-warning text-ui-warning',
	danger: 'border-ui-danger text-ui-danger',
};

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center justify-center border bg-ui-bg px-1.5 py-0.5 rounded-ui-control',
				'text-[10px] font-medium font-tight tabular-nums',
				TONE_CLASS[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
