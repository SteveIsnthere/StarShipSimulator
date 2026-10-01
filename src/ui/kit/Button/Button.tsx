/**
 * Button — unified primitive. See docs/design/design-system.md §9.
 *
 * Variants:
 *  - primary:    white fill, black text (the one main CTA per surface)
 *  - secondary:  black field with a white boundary (default action)
 *  - soft:       quieter near-black field — the returning-user / resume CTA.
 *                Beats secondary but loses to primary in the visual hierarchy.
 *  - ghost:      transparent, hover only (toolbar / icon buttons)
 *  - danger:     fixed semantic danger boundary/text
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon-sm' | 'icon-md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: ReactNode;
	children?: ReactNode;
}

// Boundaries and inversion carry hierarchy. Danger keeps its fixed semantic
// role while white remains the product accent.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
	primary:
		'border border-ui-line bg-ui-selected text-ui-on-selected hover:bg-ui-muted font-semibold',
	secondary:
		'border border-ui-line bg-ui-bg text-ui-fg hover:bg-ui-fg hover:text-ui-on-selected',
	soft:
		'border border-ui-line-muted bg-ui-surface-raised text-ui-fg hover:border-ui-line font-medium',
	ghost:
		'border border-transparent bg-transparent text-ui-muted hover:border-ui-line hover:text-ui-fg',
	danger:
		'border border-ui-danger bg-ui-bg text-ui-danger hover:bg-ui-danger hover:text-black',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
	sm: 'px-2.5 text-[11px] gap-1.5',
	md: 'px-3.5 text-[12px] gap-2',
	'icon-sm': 'p-0 text-[11px]',
	'icon-md': 'p-0 text-[12px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = 'secondary', size = 'md', icon, className, children, disabled, ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			data-variant={variant}
			className={cn(
				'ui-target inline-flex items-center justify-center rounded-ui-control depress',
				(size === 'icon-sm' || size === 'icon-md') && 'ui-icon-target',
				'transition-colors duration-100 select-none',
				disabled && 'ui-disabled',
				SIZE_CLASS[size],
				VARIANT_CLASS[variant],
				className,
			)}
			disabled={disabled}
			{...rest}
		>
			{icon}
			{children}
		</button>
	);
});
