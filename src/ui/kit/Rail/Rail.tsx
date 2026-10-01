/**
 * Rail — vertical sidebar of icon+label items.
 * See docs/design/design-system.md §3.4.
 */
import { type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export interface RailProps {
	collapsed?: boolean;
	children: ReactNode;
	className?: string;
	'aria-label'?: string;
}

export function Rail({ collapsed = false, children, className, ...rest }: RailProps) {
	return (
		<nav
			data-collapsed={collapsed || undefined}
			className={cn(
				'flex flex-col gap-0.5 py-2 px-1.5',
				'border-r border-ui-line bg-ui-bg text-ui-fg',
				collapsed ? 'w-16' : 'w-[220px]',
				'transition-[width] duration-150',
				className,
			)}
			{...rest}
		>
			{children}
		</nav>
	);
}

export interface RailItemProps {
	icon: ReactNode;
	label: string;
	active?: boolean;
	onClick?: () => void;
	collapsed?: boolean;
	testId?: string;
}

function RailItem({ icon, label, active = false, onClick, collapsed = false, testId }: RailItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-current={active ? 'page' : undefined}
			data-testid={testId}
			title={collapsed ? label : undefined}
			className={cn(
				'ui-target relative flex items-center rounded-ui-control border border-transparent',
				collapsed ? 'justify-center px-0' : 'gap-3 px-3',
				'text-[12px] font-medium transition-colors duration-100',
				// Active state uses the shared selection inversion.
				active
					? 'border-ui-line bg-ui-selected text-ui-on-selected'
					: 'text-ui-muted hover:border-ui-line hover:text-ui-fg',
			)}
		>
			<span className="shrink-0 text-current">{icon}</span>
			{!collapsed && <span className="truncate">{label}</span>}
		</button>
	);
}

Rail.Item = RailItem;
