import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputLegend } from './InputLegend';

const hints = [{ id: 'confirm', glyph: 'A', keyboard: 'Enter', label: 'Open', tone: 'confirm' as const }];

describe('portable InputLegend', () => {
	it('switches the displayed glyph from keyboard to gamepad without changing the action', () => {
		const { rerender } = render(
			<InputLegend hints={hints} active={false} gamepadConnected={false} />,
		);
		expect(screen.getByText('Enter')).toBeInTheDocument();
		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByTestId('input-legend')).toHaveAttribute('data-active', 'false');

		rerender(<InputLegend hints={hints} active gamepadConnected />);
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.getByTestId('input-legend')).toHaveAttribute('data-active', 'true');
	});

	it('does not reserve a legend when a scope provides no hints', () => {
		const { container } = render(
			<InputLegend hints={[]} active gamepadConnected={false} />,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
