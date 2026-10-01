import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConnectedMedia, sanitizeTransitionName } from './index';

afterEach(() => vi.unstubAllGlobals());

it('provides a stable sanitized transition identity', () => {
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
	render(<ConnectedMedia transitionId="F/A-18 C" data-testid="media">Aircraft</ConnectedMedia>);
	expect(screen.getByTestId('media')).toHaveStyle({ viewTransitionName: 'aircraft-f-a-18-c' });
	expect(sanitizeTransitionName('///')).toBe('aircraft-unknown');
});

it('disables the browser transition name under reduced motion', () => {
	vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	render(<ConnectedMedia transitionId="f18" data-testid="media">Aircraft</ConnectedMedia>);
	expect(screen.getByTestId('media')).toHaveStyle({ viewTransitionName: 'none' });
});

it('does not expose an unpainted media surface as a connected snapshot', () => {
	vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
	const { rerender } = render(<ConnectedMedia transitionId="f18" enabled={false} data-testid="media">Loading</ConnectedMedia>);
	expect(screen.getByTestId('media')).toHaveStyle({ viewTransitionName: 'none' });
	rerender(<ConnectedMedia transitionId="f18" enabled data-testid="media">Aircraft</ConnectedMedia>);
	expect(screen.getByTestId('media')).toHaveStyle({ viewTransitionName: 'aircraft-f18' });
});
