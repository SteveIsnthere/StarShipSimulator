import type { ReactNode } from 'react';
import { cn } from '@ui/internal/utils';
import type { InputHint, InputLegendProps } from './types';

const TONE_CLASS: Record<NonNullable<InputHint['tone']>, string> = {
	neutral: 'border-ui-line-muted bg-ui-bg text-ui-muted',
	confirm: 'border-ui-line bg-ui-selected text-ui-on-selected',
	back: 'border-ui-danger bg-ui-bg text-ui-danger',
};

function GlyphPill({ children, tone = 'neutral', dormant }: { children: ReactNode; tone?: InputHint['tone']; dormant?: boolean }) {
	return (
		<span className={cn(
			'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-ui-control border px-1',
			'font-mono text-[10px] font-semibold leading-none',
			dormant ? 'border-ui-line-muted bg-ui-disabled-bg text-ui-disabled-fg' : TONE_CLASS[tone ?? 'neutral'],
		)}>
			{children}
		</span>
	);
}

/**
 * Prop-driven input hints. Product input context belongs in an adapter.
 * The legend remains mounted while navigation is inactive and dims instead of
 * disappearing, so switching between pointer, keyboard and gamepad never shifts
 * the surrounding layout.
 */
export function InputLegend({ hints, active, gamepadConnected, className }: InputLegendProps) {
	if (hints.length === 0) return null;
	return (
		<div className={cn('pointer-events-none hidden justify-center pb-3 pt-2 sm:flex', className)}>
			<div
				data-testid="input-legend"
				data-active={active ? 'true' : 'false'}
				className={cn(
					'inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1',
					'rounded-ui-panel border border-ui-line-muted bg-ui-bg px-3.5 py-1.5',
				)}
			>
				{hints.map(hint => (
					<div key={hint.id} className="flex items-center gap-1.5">
						<GlyphPill tone={hint.tone} dormant={!active}>
							{gamepadConnected ? hint.glyph : hint.keyboard ?? hint.glyph}
						</GlyphPill>
						<span className={cn('text-[11px] font-medium', active ? 'text-ui-muted' : 'text-ui-disabled-fg')}>{hint.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
