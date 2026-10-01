import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@ui/Button';
import { GamepadScope } from '@ui/input';
import { registerConfirmHost, type PendingConfirmRequest } from './requests';

export function ConfirmDialogHost() {
	const [queue, setQueue] = useState<PendingConfirmRequest[]>([]);
	const queueRef = useRef(queue);
	const contentRef = useRef<HTMLDivElement>(null);
	const settledRequestsRef = useRef(new WeakSet<PendingConfirmRequest>());
	// The element that had focus when a request was made. Requests open without a
	// Radix trigger, so Radix has nothing to return focus to; the host returns it.
	const openersRef = useRef(new WeakMap<PendingConfirmRequest, HTMLElement>());
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const current = queue[0] ?? null;
	useEffect(() => { queueRef.current = queue; }, [queue]);

	useEffect(() => {
		const unregister = registerConfirmHost(request => {
			// A request queued behind an open one returns focus where the first
			// would have: the active element is that dialog's own button.
			const ahead = queueRef.current[0];
			const opener = ahead ? openersRef.current.get(ahead) : document.activeElement;
			if (opener instanceof HTMLElement && opener !== document.body) openersRef.current.set(request, opener);
			queueRef.current = [...queueRef.current, request];
			setQueue(existing => [...existing, request]);
		});
		return () => {
			unregister();
			for (const request of queueRef.current) request.resolve(false);
			queueRef.current = [];
		};
	}, []);

	const settle = useCallback((accepted: boolean) => {
		const request = current;
		if (!request || settledRequestsRef.current.has(request)) return;
		settledRequestsRef.current.add(request);
		returnFocusRef.current = openersRef.current.get(request) ?? null;
		request.resolve(accepted);
		setQueue(existing => existing[0] === request ? existing.slice(1) : existing);
	}, [current]);

	if (!current) return null;
	const cancelIsDefault = current.defaultAction === 'cancel' && !current.acknowledgeOnly;

	return (
		<DialogPrimitive.Root open onOpenChange={open => { if (!open) settle(false); }}>
			<DialogPrimitive.Portal>
				<GamepadScope onBack={() => settle(false)} autoFocus>
					<DialogPrimitive.Overlay
						className="fixed inset-0 bg-black/80 animate-[fade-in_60ms_ease-out]"
						style={{ zIndex: 'var(--z-overlay-portal)' }}
						data-testid="confirm-dialog-backdrop"
						onClick={() => settle(false)}
					/>
					<DialogPrimitive.Content
						ref={contentRef}
						role="alertdialog"
						aria-describedby={current.body ? 'confirm-dialog-body' : undefined}
						className="ui-overlay-panel fixed left-1/2 top-1/2 z-[var(--z-overlay-portal)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-ui-tile p-5 text-ui-fg animate-[dialog-enter_120ms_ease-out]"
						data-testid="confirm-dialog"
						onEscapeKeyDown={event => event.preventDefault()}
						onPointerDownOutside={event => event.preventDefault()}
						onOpenAutoFocus={event => {
							event.preventDefault();
							contentRef.current?.querySelector<HTMLElement>('[data-gp-initial]')?.focus({ preventScroll: true });
						}}
						onCloseAutoFocus={event => {
							// Connected openers regain focus, scrolled only as far as needed
							// to be fully visible (Escape can latch the taller gamepad
							// density while the dialog is open); a disconnected opener is
							// ignored (design-system §11).
							event.preventDefault();
							const opener = returnFocusRef.current;
							returnFocusRef.current = null;
							if (!opener?.isConnected) return;
							opener.focus({ preventScroll: true });
							// A disabled opener refuses focus; then leave the page where it is.
							if (document.activeElement === opener) opener.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
						}}
					>
						<DialogPrimitive.Title className="text-base font-semibold text-ui-fg">{current.title}</DialogPrimitive.Title>
						{current.body && <DialogPrimitive.Description id="confirm-dialog-body" className="mt-2 text-sm leading-6 text-ui-muted">{current.body}</DialogPrimitive.Description>}
						<div className="mt-5 flex justify-end gap-2">
							{!current.acknowledgeOnly && <Button variant="ghost" onClick={() => settle(false)} data-testid="confirm-dialog-cancel" data-gp-initial={cancelIsDefault ? 'true' : undefined}>{current.cancelLabel ?? 'Cancel'}</Button>}
							<Button variant={current.danger ? 'danger' : 'primary'} onClick={() => settle(true)} data-testid="confirm-dialog-confirm" data-gp-initial={cancelIsDefault ? undefined : 'true'}>{current.confirmLabel ?? 'Continue'}</Button>
						</div>
					</DialogPrimitive.Content>
				</GamepadScope>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
