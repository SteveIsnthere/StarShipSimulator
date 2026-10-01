import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { LoadingState } from './LoadingState';

vi.mock('@ui/BrickField', () => ({ BrickField: ({ active }: { active: boolean }) => <div data-testid="field" data-active={active} /> }));
vi.mock('@ui/TransitionView', () => ({ TransitionView: ({ children }: { children: React.ReactNode }) => children }));

it('renders valid measured progress and never derives unknown progress', () => {
	const { rerender } = render(<LoadingState state={{ kind: 'pending', label: 'Downloading', progress: { completed: 2, total: 4 } }} />);
	expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');
	render(<LoadingState state={{ kind: 'pending', label: 'Unknown', progress: { completed: 5, total: 0 } }} />);
	expect(screen.getByRole('progressbar', { name: 'Unknown' })).not.toHaveAttribute('value');
	rerender(<LoadingState state={{ kind: 'ready', label: 'Ready' }}>Flight</LoadingState>);
	expect(screen.getByText('Flight')).toBeInTheDocument();
});

it('stops the field on error and exposes the exact retry action', async () => {
	const retry = vi.fn();
	const user = userEvent.setup();
	render(<LoadingState state={{ kind: 'error', label: 'Failed to start', detail: 'Adapter unavailable' }} onRetry={retry} />);
	expect(screen.getByTestId('field')).toHaveAttribute('data-active', 'false');
	expect(screen.getByText('Adapter unavailable')).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Try again' }));
	expect(retry).toHaveBeenCalledOnce();
});

it('names the cancel action by what it does', async () => {
	const cancel = vi.fn();
	const user = userEvent.setup();
	const { rerender } = render(<LoadingState state={{ kind: 'pending', label: 'Loading' }} onCancel={cancel} />);
	expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
	rerender(<LoadingState state={{ kind: 'error', label: 'Failed', detail: 'x' }} onCancel={cancel} cancelLabel="Back" />);
	await user.click(screen.getByRole('button', { name: 'Back' }));
	expect(cancel).toHaveBeenCalledOnce();
});

it('stops decoration for a hidden owner without pretending the operation is ready', () => {
	const { rerender } = render(<LoadingState animate={false} state={{ kind: 'pending', label: 'Loading' }} />);
	expect(screen.getByTestId('field')).toHaveAttribute('data-active', 'false');
	expect(screen.getByRole('progressbar')).toBeInTheDocument();
	rerender(<LoadingState animate state={{ kind: 'pending', label: 'Loading' }} />);
	expect(screen.getByTestId('field')).toHaveAttribute('data-active', 'true');
});
