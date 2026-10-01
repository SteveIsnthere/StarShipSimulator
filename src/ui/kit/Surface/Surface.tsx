/** Surface — bounded, flat UI plate. See docs/design/design-system.md §3.1. */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export type SurfaceVariant = 'default' | 'raised' | 'sunken' | 'chrome';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
	variant?: SurfaceVariant;
	children?: ReactNode;
}

const VARIANT_CLASS: Record<SurfaceVariant, string> = {
	default: 'bg-ui-surface',
	raised: 'bg-ui-surface-raised',
	sunken: 'bg-ui-surface-sunken',
	// Dense neutral chrome for dialog body / overlay shells — sits as a
	// reliable dark plate on top of the dialog scrim so inner Surfaces
	// refract THIS plate, not the live scene. Hue 210 matches surface tokens.
	chrome: 'bg-ui-bg',
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
	{ variant = 'default', className, children, ...rest },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cn(
				VARIANT_CLASS[variant],
				'rounded-ui-panel border border-ui-line-muted',
				className,
			)}
			{...rest}
		>
			{children}
		</div>
	);
});
