import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@ui/motion';
import { cn } from '@ui/internal/utils';

export interface TransitionViewProps {
	transitionKey: string;
	children: ReactNode;
	className?: string;
	exitMs?: number;
	enterMs?: number;
	onSettled?: (key: string) => void;
}

interface ViewIdentity { key: string; node: ReactNode }
interface ViewState { displayed: ViewIdentity; pending: ViewIdentity; phase: 'idle' | 'exit' | 'enter'; revision: number }

export function TransitionView({ transitionKey, children, className, exitMs = 100, enterMs = 160, onSettled }: TransitionViewProps) {
	const reduced = useReducedMotion();
	const [view, setView] = useState<ViewState>(() => ({ displayed: { key: transitionKey, node: children }, pending: { key: transitionKey, node: children }, phase: 'idle', revision: 0 }));
	const settledRef = useRef(onSettled);
	const notifiedRef = useRef(0);
	useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

	// Reconcile requested identity before committing children. Pending changes during
	// exit do not restart the clock or replace the outgoing view.
	if (view.pending.key !== transitionKey || view.pending.node !== children || (reduced && view.phase !== 'idle')) {
		const pending = { key: transitionKey, node: children };
		if (reduced) {
			const changed = view.displayed.key !== transitionKey || view.phase !== 'idle';
			setView({ displayed: pending, pending, phase: 'idle', revision: view.revision + Number(changed) });
		} else if (view.phase === 'exit') {
			setView({ ...view, pending });
		} else if (view.displayed.key !== transitionKey) {
			setView({ ...view, pending, phase: 'exit', revision: view.revision + 1 });
		} else {
			setView({ ...view, displayed: pending, pending });
		}
	}

	useEffect(() => {
		if (view.phase === 'idle') return;
		const timer = window.setTimeout(() => {
			setView(current => {
				if (current.revision !== view.revision || current.phase !== view.phase) return current;
				return current.phase === 'exit'
					? { ...current, displayed: current.pending, phase: 'enter' }
					: { ...current, phase: 'idle' };
			});
		}, view.phase === 'exit' ? exitMs : enterMs);
		return () => window.clearTimeout(timer);
	}, [view.phase, view.revision, enterMs, exitMs]);
	useEffect(() => {
		if (view.phase !== 'idle' || view.revision === notifiedRef.current) return;
		notifiedRef.current = view.revision;
		settledRef.current?.(view.displayed.key);
	}, [view.phase, view.revision, view.displayed.key]);

	const visible = view.displayed;
	return (
		<div className={cn('relative', className)} data-transition-key={visible.key} data-transition-phase={view.phase}>
			<div key={visible.key} aria-hidden={view.phase === 'exit' || undefined} inert={view.phase !== 'idle' || undefined} style={{ animationDuration: `${view.phase === 'exit' ? exitMs : enterMs}ms` }} className={cn(view.phase === 'exit' && 'ui-view-exit', view.phase === 'enter' && 'ui-view-enter')}>
				{visible.node}
			</div>
		</div>
	);
}
