import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberField } from './NumberField';

describe('NumberField', () => {
	it('keeps empty optional overrides distinct from zero without changing required-field behavior', () => {
		const optional = vi.fn(); const required = vi.fn();
		render(<><NumberField allowEmpty ariaLabel="Optional altitude" value={3000} onChange={optional} /><NumberField ariaLabel="Required altitude" value={3000} onChange={required} /></>);
		fireEvent.change(screen.getByRole('spinbutton', { name: 'Optional altitude' }), { target: { value: '' } });
		expect(optional).toHaveBeenLastCalledWith(undefined);
		fireEvent.change(screen.getByRole('spinbutton', { name: 'Optional altitude' }), { target: { value: '0' } });
		expect(optional).toHaveBeenLastCalledWith(0);
		fireEvent.change(screen.getByRole('spinbutton', { name: 'Required altitude' }), { target: { value: '' } });
		expect(required).toHaveBeenLastCalledWith(0);
	});

	it('emits finite numeric edits and preserves native range metadata', () => {
		const onChange = vi.fn();
		render(<NumberField value={12} onChange={onChange} min={0} max={20} step={0.5} suffix="kt" data-testid="speed" />);
		const input = screen.getByTestId('speed');
		expect(input).toHaveAttribute('min', '0');
		expect(input).toHaveAttribute('max', '20');
		expect(input).toHaveAttribute('step', '0.5');
		fireEvent.change(input, { target: { value: '14.5' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith(14.5);
		expect(screen.getByText('kt')).toBeInTheDocument();
	});

	it('exposes invalid and disabled state through native semantics', () => {
		render(<NumberField ariaLabel="Altitude" value={999} onChange={() => undefined} invalid disabled />);
		const input = screen.getByRole('spinbutton', { name: 'Altitude' });
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toBeDisabled();
	});

	it('keeps the native control focusable while exposing invalid state', () => {
		render(<NumberField ariaLabel="Altitude" value={999} onChange={() => undefined} invalid />);
		const input = screen.getByRole('spinbutton', { name: 'Altitude' });
		input.focus();
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute('aria-invalid', 'true');
	});

	it('wires pending and failed field state to the control', () => {
		const { rerender } = render(
			<NumberField
				id="altitude"
				value={1200}
				onChange={() => undefined}
				status={{ kind: 'pending', message: 'Saving altitude…' }}
			/>,
		);

		const input = screen.getByRole('spinbutton');
		expect(input).toHaveAttribute('aria-busy', 'true');
		expect(input).toHaveAttribute('aria-describedby', 'altitude-status');
		expect(screen.getByRole('status')).toHaveTextContent('Saving altitude…');

		rerender(
			<NumberField
				id="altitude"
				value={1200}
				onChange={() => undefined}
				status={{ kind: 'failed', message: 'Could not save altitude' }}
			/>,
		);

		expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-describedby', 'altitude-status');
		expect(screen.getByRole('alert')).toHaveTextContent('Could not save altitude');
	});

	it('does not expose a status description while idle', () => {
		render(<NumberField id="altitude" value={1200} onChange={() => undefined} />);

		expect(screen.getByRole('spinbutton')).not.toHaveAttribute('aria-describedby');
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
