/**
 * CardGroup — a single tier-bg sheet containing 2+ stacked rows
 * separated by horizontal hairline dividers. Use instead of stacking
 * 2+ standalone <Surface>s as peers (the v0 pattern that produced the
 * "checkerboard of framed cards" feeling).
 *
 * See docs/design/design-system.md §3.2.
 *
 * The selector `[&>*+*]:border-t [&>*+*]:border-ui-line-muted` applies a 1px
 * top border to every direct child except the first — the inter-row
 * divider. The outer sheet has NO border at rest. Children render
 * borderless and own only their inner padding / hover background.
 *
 * Do not use for: a single card (use `<Surface>`); a grid of clickable
 * options (use `<Tile>`); a horizontally segmented control (build
 * inline with the same `[&>*+*]:border-l` pattern, see
 * StartModeControl).
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export interface CardGroupProps extends HTMLAttributes<HTMLDivElement> {
	/** Inter-row separator. `hairline` (default) for dense/data rows that
	 *  need scanning help; `none` for airy rows where spacing alone
	 *  groups them (design-system.md §2.4 — prefer spacing first). */
	divider?: 'hairline' | 'none';
	children?: ReactNode;
}

export const CardGroup = forwardRef<HTMLDivElement, CardGroupProps>(function CardGroup(
	{ divider = 'hairline', className, children, ...rest },
	ref,
) {
	return (
		<div
			ref={ref}
			className={cn(
				'overflow-hidden rounded-ui-panel border border-ui-line-muted bg-ui-surface',
				divider === 'hairline' && '[&>*+*]:border-t [&>*+*]:border-ui-line-muted',
				className,
			)}
			{...rest}
		>
			{children}
		</div>
	);
});
