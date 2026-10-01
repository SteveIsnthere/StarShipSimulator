import { type ReactNode, createContext, useContext } from 'react';
import { cn } from '@ui/internal/utils';

export type TabStripVariant = 'pill' | 'bar';

export interface TabStripProps {
	children: ReactNode;
	className?: string;
	'aria-label'?: string;
	variant?: TabStripVariant;
}

const VariantContext = createContext<TabStripVariant>('pill');

export function TabStrip({ children, className, variant = 'pill', ...rest }: TabStripProps) {
	return (
		<VariantContext.Provider value={variant}>
			<div
				role="tablist"
				className={cn(
					// v3: the pill (segmented) well is a strokeless sunken fill —
					// the raised active cell carries the state (§3.4). The bar
					// variant's border-b is a section divider (whitelisted).
					variant === 'pill'
						? 'inline-flex items-center gap-0.5 rounded-ui-panel border border-ui-line-muted bg-ui-bg p-0.5'
						: 'flex w-full items-stretch border-b border-ui-line bg-ui-bg',
					className,
				)}
				{...rest}
			>
				{children}
			</div>
		</VariantContext.Provider>
	);
}

export interface TabProps {
	active?: boolean;
	onClick?: () => void;
	children: ReactNode;
	className?: string;
	testId?: string;
	initial?: boolean;
}

function Tab({ active = false, onClick, children, className, testId, initial }: TabProps) {
	const variant = useContext(VariantContext);
	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			data-testid={testId}
			data-gp-initial={initial ? 'true' : undefined}
			onClick={onClick}
			className={cn(
				'ui-target relative flex items-center justify-center text-[12px] font-medium',
				'transition-colors duration-100',
				variant === 'pill'
					? cn(
							'px-3 py-1.5 rounded-ui-control border border-transparent',
							active
								? 'border-ui-line bg-ui-selected text-ui-on-selected'
								: 'text-ui-muted hover:border-ui-line hover:text-ui-fg',
						)
					: cn(
							'flex-1 px-3 py-2.5 -mb-px border-b-2',
							active
								? 'border-ui-line text-ui-fg'
								: 'border-transparent text-ui-muted hover:text-ui-fg',
						),
				className,
			)}
		>
			{children}
		</button>
	);
}

TabStrip.Tab = Tab;
