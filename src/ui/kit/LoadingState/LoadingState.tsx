import { AlertTriangle } from 'lucide-react';
import { Button } from '@ui/Button';
import { BrickField } from '@ui/BrickField';
import { TransitionView } from '@ui/TransitionView';
import { cn } from '@ui/internal/utils';
import type { LoadingStateProps } from './types';
import './loading-layout.css';

function validProgress(progress: { completed: number; total: number } | undefined) {
	return progress !== undefined
		&& Number.isFinite(progress.completed)
		&& Number.isFinite(progress.total)
		&& progress.total > 0
		&& progress.completed >= 0
		&& progress.completed <= progress.total;
}

export function LoadingState({ state, onRetry, onCancel, cancelLabel = 'Cancel', children, footer, className, animate = true }: LoadingStateProps) {
	if (state.kind === 'ready') return <>{children}</>;
	const progress = state.kind === 'pending' && validProgress(state.progress) ? state.progress : undefined;
	return (
		<section className={cn('relative flex min-h-[320px] w-full items-center justify-center overflow-hidden bg-ui-bg text-ui-fg', className)} data-loading-kind={state.kind}>
			<BrickField active={state.kind === 'pending' && animate} className="absolute inset-0 text-ui-fg" />
			<div className="ui-loading-stack">
				{children}
				{state.kind === 'error' && <AlertTriangle className="h-8 w-8 text-ui-danger" aria-hidden="true" />}
				<div data-loading-status-slot className="ui-loading-status-slot">
					<span role="status" aria-live="polite" aria-atomic="true" className="ui-loading-announcement">{state.label}</span>
					<div className="ui-loading-visual" aria-hidden="true">
						<TransitionView transitionKey={`${state.kind}:${state.label}`}>
							<div className="ui-loading-status">{state.label}</div>
						</TransitionView>
					</div>
				</div>
				{state.kind === 'pending' && <progress aria-label={state.label} max={progress?.total} value={progress?.completed} className="sr-only" />}
				{state.kind === 'error' && <p className="text-sm leading-6 text-ui-muted">{state.detail}</p>}
				{footer}
				{(onRetry || onCancel) && <div className="flex flex-wrap justify-center gap-2">
					{onCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
					{state.kind === 'error' && onRetry && <Button variant="primary" onClick={onRetry}>Try again</Button>}
				</div>}
			</div>
		</section>
	);
}
