/**
 * FieldStatus — an explicit, accessible state message for a form control.
 *
 * The caller owns the transition to `applied`; this primitive never infers
 * success from a requested value or hides a failed application.
 */
import { cn } from '@ui/internal/utils';

export type FieldStatusState =
	| { kind: 'idle' }
	| { kind: 'pending'; message: string }
	| { kind: 'applied'; message: string }
	| { kind: 'failed'; message: string };

export interface FieldStatusProps {
	state: FieldStatusState;
	id?: string;
	className?: string;
}

export function FieldStatus({ state, id, className }: FieldStatusProps) {
	if (state.kind === 'idle') return null;

	const failed = state.kind === 'failed';
	return (
		<p
			id={id}
			role={failed ? 'alert' : 'status'}
			aria-live={failed ? 'assertive' : 'polite'}
			aria-atomic="true"
			data-field-status
			data-state={state.kind}
			className={cn(
				'text-[11px] leading-4',
				state.kind === 'pending' && 'text-ui-muted',
				state.kind === 'applied' && 'text-ui-success',
				failed && 'text-ui-danger',
				className,
			)}
		>
			{state.message}
		</p>
	);
}
