/**
 * Toggle — pill switch. Replaces 3 competing ToggleSwitch impls.
 */
import { cn } from '@ui/internal/utils';

export interface ToggleProps {
	active: boolean;
	onToggle: () => void;
	disabled?: boolean;
	className?: string;
	'aria-label'?: string;
	'data-testid'?: string;
}

export function Toggle({
	active,
	onToggle,
	disabled = false,
	className,
	'aria-label': ariaLabel,
	'data-testid': testId,
}: ToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={active}
			aria-label={ariaLabel}
			data-testid={testId}
			disabled={disabled}
			onClick={onToggle}
			className={cn(
				'ui-icon-target relative rounded-ui-control border border-transparent transition-colors duration-150',
				disabled && 'ui-disabled',
				className,
			)}
		>
			<span className={cn('absolute left-1/2 top-1/2 h-[18px] w-9 -translate-x-1/2 -translate-y-1/2 border border-ui-line bg-ui-bg', active && 'bg-ui-selected')}>
				<span className={cn('absolute top-[3px] h-3 w-3 bg-ui-fg transition-all duration-150', active ? 'left-[19px] bg-ui-on-selected' : 'left-[3px]')} />
			</span>
		</button>
	);
}
