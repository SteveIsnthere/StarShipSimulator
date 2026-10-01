import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Dialog, DialogBody, DialogHeader } from './Dialog';

it('uses the safe viewport shell and keeps one scroll owner', () => {
	render(
		<Dialog open onClose={vi.fn()} ariaLabel="Settings">
			<DialogHeader title="Settings" onClose={vi.fn()} />
			<DialogBody><p>Content remains reachable in a short viewport.</p></DialogBody>
		</Dialog>,
	);

	const dialog = screen.getByRole('dialog', { name: 'Settings' });
	expect(dialog).toHaveClass('ui-safe-viewport');
	expect(dialog).not.toHaveClass('inset-y-4', 'h-[calc(100dvh-2rem)]');
	expect(dialog.querySelector('[data-gp-body]')).toHaveClass('overflow-y-auto');
});

// `.ui-safe-viewport` is unlayered CSS, so its `left`/`right` insets beat any
// Tailwind position utility on the same element. A shell that also centres
// itself with `left-1/2 -translate-x-1/2 w-full` ends up at left = inset and
// then shifts by half its width: at 844 px wide the flight menu's left edge sat
// at −406 px (FB-133/FB-135). The safe viewport owns the insets; the shell
// centres between them with auto margins and a max width.
it('centres between the safe-viewport insets instead of positioning itself', () => {
	const css = readFileSync(resolve(__dirname, '../styles/primitives.css'), 'utf8');
	const rule = /\.ui-safe-viewport\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
	expect(rule).toMatch(/\bleft:\s*max\(/);
	expect(rule).toMatch(/\bright:\s*max\(/);

	render(
		<Dialog open onClose={vi.fn()} ariaLabel="Menu">
			<DialogHeader title="Menu" onClose={vi.fn()} />
			<DialogBody><p>Tiles</p></DialogBody>
		</Dialog>,
	);
	const classes = screen.getByRole('dialog', { name: 'Menu' }).className.split(/\s+/);
	const horizontalPositioning = classes.filter(name =>
		/^-?(left|right|inset|inset-x|start|end)-/.test(name)
		|| /^-?translate-x-/.test(name)
		|| name === 'w-full' || name === 'w-screen',
	);
	expect(horizontalPositioning).toEqual([]);
	expect(classes).toContain('mx-auto');
});
