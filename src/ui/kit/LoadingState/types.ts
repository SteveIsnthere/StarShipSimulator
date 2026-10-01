import type { ReactNode } from 'react';

export type LoadingStateValue =
	| { kind: 'pending'; label: string; progress?: { completed: number; total: number } }
	| { kind: 'ready'; label: string }
	| { kind: 'error'; label: string; detail: string };

export interface LoadingStateProps {
	state: LoadingStateValue;
	onRetry?: () => void;
	onCancel?: () => void;
	/** The cancel action's label, when "Cancel" is not what it does (e.g. "Back" after a failure). */
	cancelLabel?: string;
	children?: ReactNode;
	footer?: ReactNode;
	className?: string;
	/** Stop decorative work while the owning surface is hidden. */
	animate?: boolean;
}
