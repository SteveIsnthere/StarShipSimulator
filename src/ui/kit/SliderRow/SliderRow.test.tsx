import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SliderRow } from './SliderRow';

it('exposes its label and formatted value while preserving optional native ticks', () => {
	render(<SliderRow id="time" list="hours" label="Time of day" value={16.75} onChange={() => undefined} min={0} max={24} step={0.25} format={() => '16:45'} />);
	const slider = screen.getByRole('slider', { name: 'Time of day' });
	expect(slider).toHaveAttribute('aria-valuetext', '16:45');
	expect(slider).toHaveAttribute('list', 'hours');
});

it('removes the measured fill while disabled so dormant styling owns the track', () => {
	const { rerender } = render(<SliderRow label="Throttle" value={50} onChange={() => undefined} min={0} max={100} data-testid="throttle" />);
	expect(screen.getByTestId('throttle').getAttribute('style')).toContain('linear-gradient');
	rerender(<SliderRow label="Throttle" value={50} onChange={() => undefined} min={0} max={100} disabled data-testid="throttle" />);
	expect((screen.getByTestId('throttle') as HTMLInputElement).style.background).toBe('');
});
