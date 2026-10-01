import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LoadingState } from './LoadingState';

vi.mock('@ui/BrickField', () => ({ BrickField: () => null }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('updates one stable live region immediately outside the keyed inert animation', () => {
	vi.useFakeTimers();
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
	const { rerender } = render(<LoadingState state={{ kind: 'pending', label: 'Loading engine' }} />);
	const live = screen.getByRole('status');
	rerender(<LoadingState state={{ kind: 'pending', label: 'Initializing GPU' }} />);
	expect(screen.getByRole('status')).toBe(live);
	expect(live).toHaveTextContent('Initializing GPU');
	expect(live.closest('[inert]')).toBeNull();
	expect(screen.getByText('Loading engine').closest('[aria-hidden="true"]')).not.toBeNull();
	act(() => vi.advanceTimersByTime(100));
	act(() => vi.advanceTimersByTime(160));
	expect(screen.getAllByRole('status')).toEqual([live]);
	rerender(<LoadingState state={{ kind: 'error', label: 'Failed to start', detail: 'Unavailable' }} />);
	expect(screen.getByRole('status')).toBe(live);
	expect(live).toHaveTextContent('Failed to start');
});
