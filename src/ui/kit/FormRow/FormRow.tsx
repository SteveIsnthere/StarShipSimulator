/**
 * FormRow — `<label>...<control>` aligned row, consistent gap and typography.
 */
import type { ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export interface FormRowProps {
	label: ReactNode;
	/** Optional association for a row containing one labelled control. */
	labelFor?: string;
	/** Optional value preview rendered to the right of the label, before the control. */
	value?: ReactNode;
	/** Stacked layout (label above control). Default: inline (label/control on the same row). */
	stacked?: boolean;
	className?: string;
	children: ReactNode;
}

export function FormRow({ label, labelFor, value, stacked = false, className, children }: FormRowProps) {
	const labelNode = labelFor ? (
		<label htmlFor={labelFor} className="text-[11px] text-ui-muted">{label}</label>
	) : (
		<span className="text-[11px] text-ui-muted">{label}</span>
	);

	if (stacked) {
		return (
			<div className={cn('flex flex-col gap-1.5', className)}>
				<div className="flex items-center justify-between gap-2">
					{labelNode}
					{value != null && (
						<span className="text-[11px] font-mono tabular-nums text-ui-fg">{value}</span>
					)}
				</div>
				{children}
			</div>
		);
	}
	return (
		<div className={cn('flex items-center justify-between gap-3 py-1', className)}>
			{labelNode}
			<div className="flex items-center gap-2">
				{value != null && (
					<span className="text-[11px] font-mono tabular-nums text-ui-fg">{value}</span>
				)}
				{children}
			</div>
		</div>
	);
}
