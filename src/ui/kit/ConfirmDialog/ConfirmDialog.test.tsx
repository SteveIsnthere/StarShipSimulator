import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { GamepadNavProvider } from '@ui/input';
import { alertDialog, confirmDialog, ConfirmDialogHost, hasOpenConfirmDialog } from './index';

afterEach(() => vi.restoreAllMocks());

it('falls back to the native confirmation when no host is mounted', async () => {
	const fallback = vi.spyOn(window, 'confirm').mockReturnValue(true);
	await expect(confirmDialog({ title: 'Fallback', body: 'Still resolves.' })).resolves.toBe(true);
	expect(fallback).toHaveBeenCalledExactlyOnceWith('Fallback\n\nStill resolves.');
});

it('queues requests, resolves each once, and preserves alert semantics', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><ConfirmDialogHost /></GamepadNavProvider>);
	let first!: Promise<boolean>;
	let second!: Promise<void>;
	act(() => {
		first = confirmDialog({ title: 'Delete aircraft?', danger: true });
		second = alertDialog({ title: 'Saved' });
	});

	expect(await screen.findByRole('alertdialog', { name: 'Delete aircraft?' })).toBeInTheDocument();
	await waitFor(() => expect(screen.getByTestId('confirm-dialog-confirm')).toHaveFocus());
	await user.click(screen.getByTestId('confirm-dialog-cancel'));
	await expect(first).resolves.toBe(false);

	expect(await screen.findByRole('alertdialog', { name: 'Saved' })).toBeInTheDocument();
	expect(screen.queryByTestId('confirm-dialog-cancel')).not.toBeInTheDocument();
	await user.click(screen.getByTestId('confirm-dialog-confirm'));
	await expect(second).resolves.toBeUndefined();
	await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
});

it('lets the top gamepad scope own Escape', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><ConfirmDialogHost /></GamepadNavProvider>);
	let result!: Promise<boolean>;
	act(() => { result = confirmDialog({ title: 'Leave flight?' }); });
	await screen.findByRole('alertdialog', { name: 'Leave flight?' });
	await user.keyboard('{Escape}');
	await expect(result).resolves.toBe(false);
	await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
});

it('returns focus to the element that opened it, and ignores one that is gone', async () => {
	const user = userEvent.setup();
	const view = render(<GamepadNavProvider><button type="button">Opener</button><ConfirmDialogHost /></GamepadNavProvider>);
	const opener = screen.getByRole('button', { name: 'Opener' });
	opener.focus();
	let result!: Promise<boolean>;
	act(() => { result = confirmDialog({ title: 'Reset all?' }); });
	await screen.findByRole('alertdialog', { name: 'Reset all?' });
	await user.keyboard('{Escape}');
	await expect(result).resolves.toBe(false);
	await waitFor(() => expect(opener).toHaveFocus());

	act(() => { result = confirmDialog({ title: 'Remove it?' }); });
	await screen.findByRole('alertdialog', { name: 'Remove it?' });
	view.rerender(<GamepadNavProvider>{null}<ConfirmDialogHost /></GamepadNavProvider>);
	await user.click(screen.getByTestId('confirm-dialog-cancel'));
	await expect(result).resolves.toBe(false);
	await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
	expect(opener.isConnected).toBe(false);
});

it('preserves backdrop cancellation', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><ConfirmDialogHost /></GamepadNavProvider>);
	let result!: Promise<boolean>;
	act(() => { result = confirmDialog({ title: 'Discard changes?' }); });
	await screen.findByRole('alertdialog', { name: 'Discard changes?' });
	await user.click(screen.getByTestId('confirm-dialog-backdrop'));
	await expect(result).resolves.toBe(false);
});

it('focuses the safe action when a destructive request asks for it, and returns focus on close', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><button type="button">Trigger</button><ConfirmDialogHost /></GamepadNavProvider>);
	const trigger = screen.getByRole('button', { name: 'Trigger' });
	trigger.focus();
	let result!: Promise<boolean>;
	act(() => { result = confirmDialog({ title: 'Reset aircraft?', danger: true, defaultAction: 'cancel' }); });
	await screen.findByRole('alertdialog', { name: 'Reset aircraft?' });
	await waitFor(() => expect(screen.getByTestId('confirm-dialog-cancel')).toHaveFocus());
	// Enter answers the focused, safe action: the key press cannot carry the reset out.
	await user.keyboard('{Enter}');
	await expect(result).resolves.toBe(false);
	await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
	await waitFor(() => expect(trigger).toHaveFocus());
});

it('reports an open confirmation until it settles, so global key owners can stand down', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><ConfirmDialogHost /></GamepadNavProvider>);
	expect(hasOpenConfirmDialog()).toBe(false);
	let result!: Promise<boolean>;
	act(() => { result = confirmDialog({ title: 'Delete recording?' }); });
	expect(hasOpenConfirmDialog()).toBe(true);
	await screen.findByRole('alertdialog', { name: 'Delete recording?' });
	await user.click(screen.getByTestId('confirm-dialog-cancel'));
	await expect(result).resolves.toBe(false);
	expect(hasOpenConfirmDialog()).toBe(false);
});
