/**
 * KeyCap — keyboard glyph chip. Use for inline shortcuts and KeybindEditor.
 *
 * Uses the portable high-contrast boundary so it remains readable.
 */
import type { ReactNode } from 'react';
import { cn } from '@ui/internal/utils';

export interface KeyCapProps {
	children: ReactNode;
	/** Highlight as the currently captured / active key. */
	active?: boolean;
	className?: string;
}

export function KeyCap({ children, active = false, className }: KeyCapProps) {
	return (
		<kbd
			className={cn(
				'inline-flex items-center justify-center border',
				'min-w-[20px] h-[18px] px-1.5 rounded-ui-control',
				'text-[10px] font-mono leading-none',
				// v3: active = accent ink + soft fill (no border recolour).
				active ? 'border-ui-line bg-ui-selected text-ui-on-selected' : 'border-ui-line-muted bg-ui-bg text-ui-muted',
				className,
			)}
		>
			{children}
		</kbd>
	);
}
