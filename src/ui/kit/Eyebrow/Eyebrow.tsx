/**
 * Eyebrow — small-caps tracked section label.
 *
 * The single most-repeated typographic pattern in the app: UPPERCASE,
 * letter-spacing 0.13–0.22em, dim color, sits above a title or beside
 * a metric. Extracted from ~18 inline call sites that all spelled out
 * `font-tight text-[11px] font-semibold uppercase tracking-[0.14em]`
 * with the portable dim text token.
 *
 * See docs/design/design-system.md §5.
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export type EyebrowSize = 'sm' | 'md' | 'lg';
export type EyebrowTone = 'dim' | 'muted' | 'accent';

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
	/** Render as a custom element. Defaults to `<span>`. Use `p` / `h2` / `dt`
	 *  when the eyebrow is the only label of its row and you need semantics. */
	as?: 'span' | 'p' | 'h2' | 'h3' | 'dt' | 'label';
	/** Type size. sm = 10px, md = 11px (default), lg = 13px. */
	size?: EyebrowSize;
	/** Color tone. Accent uses white; it never identifies a category. */
	tone?: EyebrowTone;
	/** Letter-spacing scale. 'tight' = 0.13em, 'md' = 0.14em (default),
	 *  'lg' = 0.16em, 'xl' = 0.22em (hero / brand eyebrows). */
	tracking?: 'tight' | 'md' | 'lg' | 'xl';
	children?: ReactNode;
}

const SIZE_CLASS: Record<EyebrowSize, string> = {
	sm: 'text-[10px]',
	md: 'text-[11px]',
	lg: 'text-[13px]',
};

const TRACKING_CLASS: Record<NonNullable<EyebrowProps['tracking']>, string> = {
	tight: 'tracking-[0.13em]',
	md: 'tracking-[0.14em]',
	lg: 'tracking-[0.16em]',
	xl: 'tracking-[0.22em]',
};

const TONE_CLASS: Record<EyebrowTone, string> = {
	dim: 'text-ui-dim',
	muted: 'text-ui-muted',
	accent: 'text-ui-fg',
};

export const Eyebrow = forwardRef<HTMLSpanElement, EyebrowProps>(function Eyebrow(
	{ as: Tag = 'span', size = 'md', tone = 'dim', tracking = 'md', className, children, ...rest },
	ref,
) {
	const ElementTag = Tag as 'span';
	return (
		<ElementTag
			ref={ref}
			className={cn(
				'font-tight font-semibold uppercase',
				SIZE_CLASS[size],
				TRACKING_CLASS[tracking],
				TONE_CLASS[tone],
				className,
			)}
			{...rest}
		>
			{children}
		</ElementTag>
	);
});
