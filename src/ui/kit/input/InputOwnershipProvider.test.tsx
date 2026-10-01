import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InputOwnershipProvider } from './InputOwnershipProvider';
import { useInputOwnershipContext, useInputOwnership } from './ownershipContext';

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

function Probe({ onRelease }: { onRelease: (reason: string) => void }) {
	const context = useInputOwnership('keyboard', onRelease);
	return <output data-testid="suspended">{String(context.suspended)}</output>;
}

it('releases momentary inputs and suspends producers on browser lifecycle loss', () => {
	const onRelease = vi.fn();
	render(<InputOwnershipProvider><Probe onRelease={onRelease} /></InputOwnershipProvider>);

	act(() => window.dispatchEvent(new Event('blur')));
	expect(onRelease).toHaveBeenCalledExactlyOnceWith('window-blur');
	expect(screen.getByTestId('suspended')).toHaveTextContent('true');

	act(() => window.dispatchEvent(new Event('focus')));
	expect(screen.getByTestId('suspended')).toHaveTextContent('false');

	Object.defineProperty(document, 'hidden', { configurable: true, value: true });
	act(() => document.dispatchEvent(new Event('visibilitychange')));
	expect(onRelease).toHaveBeenCalledWith('document-hidden');
	expect(screen.getByTestId('suspended')).toHaveTextContent('true');
});

it('handles pagehide/pageshow and does not retain registrations after unmount', () => {
	const onRelease = vi.fn();
	const view = render(<InputOwnershipProvider><Probe onRelease={onRelease} /></InputOwnershipProvider>);

	act(() => window.dispatchEvent(new Event('pagehide')));
	expect(onRelease).toHaveBeenCalledExactlyOnceWith('pagehide');
	act(() => window.dispatchEvent(new Event('pageshow')));
	expect(screen.getByTestId('suspended')).toHaveTextContent('false');

	view.unmount();
	act(() => window.dispatchEvent(new Event('blur')));
	expect(onRelease).toHaveBeenCalledWith('session-change');
	expect(onRelease).toHaveBeenCalledTimes(2);
});

it('allows an app adapter to release without suspending the whole provider', () => {
	const onRelease = vi.fn();
	function AdapterProbe() {
		const { releaseMomentary, suspended } = useInputOwnershipContext();
		return <button onClick={() => releaseMomentary('route-change')}>{String(suspended)}</button>;
	}

	render(<InputOwnershipProvider><Probe onRelease={onRelease} /><AdapterProbe /></InputOwnershipProvider>);
	fireEvent.click(screen.getByRole('button'));
	expect(onRelease).toHaveBeenCalledExactlyOnceWith('route-change');
	expect(screen.getByRole('button')).toHaveTextContent('false');
});
