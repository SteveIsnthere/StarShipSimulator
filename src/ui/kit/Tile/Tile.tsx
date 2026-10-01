/**
 * Tile — interactive card used in grids (aircraft picker, scenarios,
 * builder gallery). See docs/design/design-system.md §3.2.
 *
 * Renders as <button> by default, or <a>/Link via the `as`/`href`/`to` props
 * (use the `asChild` pattern by passing a custom component if you need
 * react-router Link).
 */
import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

/**
 * Tile size + shape variants. See [docs/plans/preflight-ux-overhaul/phase-1-foundations.md](../../../../docs/plans/preflight-ux-overhaul/phase-1-foundations.md).
 *
 *   launcher → grid tile (Landing hub). Min-height 208 px, 24 px padding,
 *              flex-col with `justify-between` so an icon sits top-left and
 *              the title/tagline pair sits bottom-left.
 *   list     → list-row tile (Missions list, Challenges-after-Phase-5).
 *              Tighter padding, no min-height.
 *   image    → 3:2 image tile (reserved for future "screenshot" tiles).
 */
export type TileVariant = 'launcher' | 'list' | 'image';

const VARIANT_CLS: Record<TileVariant, string> = {
	launcher: 'min-h-[208px] flex-col justify-between p-6 rounded-ui-sheet',
	list:     'p-4 rounded-ui-tile flex-col gap-2',
	image:    'aspect-[3/2] flex-col justify-end p-5 rounded-ui-sheet overflow-hidden',
};

export interface TileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
	selected?: boolean;
	disabled?: boolean;
	children?: ReactNode;
	/** Size + shape preset. See `TileVariant`. Defaults to the legacy
	 *  shape (gap-3, p-4, no min-h, rounded-[10px]) for callers that
	 *  haven't migrated yet. */
	variant?: TileVariant;
	/** Visually elevate this tile (soft accent fill) without marking it as
	 * the current selection — e.g. the "primary" launch tile or a danger
	 * End-flight tile. */
	emphasised?: boolean;
	/** Semantic treatment. Danger is reserved for destructive actions. */
	tone?: 'neutral' | 'danger';
}

export const Tile = forwardRef<HTMLButtonElement, TileProps>(function Tile(
	{ selected = false, disabled = false, emphasised = false, tone = 'neutral', variant, className, style, children, ...rest },
	ref,
) {
	const resolvedTone = tone === 'danger' ? 'danger' : 'neutral';
	const mergedStyle: CSSProperties | undefined = style;
	return (
		<button
			ref={ref}
			disabled={disabled}
			style={mergedStyle}
			data-selected={selected || undefined}
			data-tone={resolvedTone}
			className={cn(
				// Layout (legacy default; variant overrides padding + min-h + radius below)
				'group relative flex items-start text-left depress',
				'ui-target border border-ui-line-muted',
				variant ? VARIANT_CLS[variant] : 'flex-col gap-3 p-4 rounded-ui-tile',
				// One deliberate perimeter; nested content remains unboxed.
				'bg-ui-surface',
				// Hover (mouse only — controlled by GamepadNavContext via [data-gp-nav])
				!disabled && !(selected || emphasised) && 'hover:border-ui-line hover:bg-ui-surface-raised',
				// Selected and destructive states are explicit and hue-independent.
				(selected || emphasised) && resolvedTone === 'neutral' && 'border-ui-line bg-ui-selected text-ui-on-selected hover:bg-ui-selected',
				(selected || emphasised) && resolvedTone === 'danger' && 'border-ui-danger bg-ui-danger text-black hover:bg-ui-danger',
				resolvedTone === 'danger' && !(selected || emphasised) && 'border-ui-danger text-ui-danger',
				// Active press
				'active:bg-ui-muted active:text-ui-on-selected',
				// Transition
				'transition-colors duration-100',
				disabled && 'ui-disabled',
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	);
});
