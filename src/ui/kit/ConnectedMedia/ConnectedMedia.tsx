import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useReducedMotion } from '@ui/motion';
import { cn } from '@ui/internal/utils';
import { sanitizeTransitionName } from './transitionName';

export interface ConnectedMediaProps extends HTMLAttributes<HTMLDivElement> {
	transitionId: string;
	aspectRatio?: string;
	children: ReactNode;
	enabled?: boolean;
}

export function ConnectedMedia({ transitionId, aspectRatio = '3 / 2', children, className, style, enabled = true, ...rest }: ConnectedMediaProps) {
	const reduced = useReducedMotion();
	return (
		<div
			className={cn('relative overflow-hidden', className)}
			style={{
				...style,
				aspectRatio,
				viewTransitionName: reduced || !enabled ? 'none' : sanitizeTransitionName(transitionId),
			} as CSSProperties}
			data-transition-id={transitionId}
			{...rest}
		>
			{children}
		</div>
	);
}
