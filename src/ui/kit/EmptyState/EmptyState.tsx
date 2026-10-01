/**
 * EmptyState — compact placeholder for an empty list, missing recording,
 * or unavailable catalog. Keep copy short and action-led.
 */
import { type ReactNode } from 'react';
import { Surface } from '@ui/Surface';
import { cn } from '@ui/internal/utils';

export interface EmptyStateProps {
	title: string;
	body?: string;
	action?: ReactNode;
	className?: string;
	testId?: string;
}

export function EmptyState({ title, body, action, className, testId }: EmptyStateProps) {
	return (
		<Surface
			data-testid={testId}
			className={cn('flex flex-col items-center justify-center px-5 py-8 text-center', className)}
		>
			<div className="max-w-sm">
				<h3 className="text-sm font-semibold text-ui-fg">{title}</h3>
				{body && <p className="mt-2 text-sm leading-6 text-ui-muted">{body}</p>}
				{action && <div className="mt-4 flex justify-center">{action}</div>}
			</div>
		</Surface>
	);
}
