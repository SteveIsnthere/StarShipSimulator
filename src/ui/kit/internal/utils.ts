import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Register both the legacy product radius scale in styles/theme.css and the
// portable zero-radius scale in ui/tokens.css. Without this, tailwind-merge doesn't know they
// belong to the radius group, so a className radius override (e.g. a
// A child radius override on a Surface that defaults to `rounded-ui-panel`
// fails to dedupe — both classes survive and the CSS
// cascade, not the caller's override, picks the winner. Registering them here
// makes the last radius class win, as callers expect.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			rounded: [{ rounded: ['control', 'panel', 'tile', 'sheet', 'ui-control', 'ui-panel', 'ui-tile', 'ui-sheet'] }],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
