import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, expect, it, vi } from 'vitest';
import { GamepadScope } from './GamepadScope';
import { GamepadNavProvider } from './GamepadNavProvider';
import { useInputContext } from './useInputContext';

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
		x: 0, y: 0, left: 0, top: 0, right: 80, bottom: 32, width: 80, height: 32,
		toJSON: () => ({}),
	}));
});

function HintProbe() {
	const { activeHints } = useInputContext();
	return <output aria-label="Active hints">{activeHints.map(hint => hint.label).join(',')}</output>;
}

it('routes Back and hints to the topmost mounted scope', async () => {
	const user = userEvent.setup();
	const parentBack = vi.fn();
	const childBack = vi.fn();
	function Harness() {
		const [child, setChild] = useState(true);
		return <GamepadNavProvider><HintProbe /><GamepadScope onBack={parentBack} hints={[{ glyph: 'B', label: 'Parent' }]}><button>Parent action</button>{child && <GamepadScope onBack={() => { childBack(); setChild(false); }} hints={[{ glyph: 'B', label: 'Child' }]}><button>Child action</button></GamepadScope>}</GamepadScope></GamepadNavProvider>;
	}
	render(<Harness />);
	expect(screen.getByLabelText('Active hints')).toHaveTextContent('Child');
	await user.keyboard('{Escape}');
	expect(childBack).toHaveBeenCalledOnce();
	expect(parentBack).not.toHaveBeenCalled();
	await waitFor(() => expect(screen.getByLabelText('Active hints')).toHaveTextContent('Parent'));
	await user.keyboard('{Escape}');
	expect(parentBack).toHaveBeenCalledOnce();
});

it('focuses the declared initial action when a scope requests autofocus', async () => {
	render(<GamepadNavProvider><GamepadScope autoFocus><button>First</button><button data-gp-initial="true">Preferred</button></GamepadScope></GamepadNavProvider>);
	await waitFor(() => expect(screen.getByRole('button', { name: 'Preferred' })).toHaveFocus());
});

it('moves autofocus in the next frame, not in the commit that registered the scope (FB-177)', async () => {
	// Finding the target reads layout; inside the commit that forced a full page layout.
	render(<GamepadNavProvider><GamepadScope autoFocus><button>First</button></GamepadScope></GamepadNavProvider>);
	const first = screen.getByRole('button', { name: 'First' });
	expect(first).not.toHaveFocus();
	await waitFor(() => expect(first).toHaveFocus());
});

it('autofocuses without scrolling the page until gamepad navigation is in use', async () => {
	// A page opened with a mouse or a finger must stay at its top, even when its
	// initial action sits at the bottom of a single-column layout.
	const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView);
	scroll.mockClear();
	render(<GamepadNavProvider><GamepadScope autoFocus><button data-gp-initial="true">Launch</button></GamepadScope></GamepadNavProvider>);
	await waitFor(() => expect(screen.getByRole('button', { name: 'Launch' })).toHaveFocus());
	expect(scroll).not.toHaveBeenCalled();
});

it('scrolls the autofocus target into view for a gamepad pilot', async () => {
	// Positive control for the test above: with navigation active, the target is revealed.
	const user = userEvent.setup();
	const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView);
	function Harness() {
		const [open, setOpen] = useState(false);
		return <GamepadNavProvider><GamepadScope><button onClick={() => setOpen(true)}>Open</button></GamepadScope>{open && <GamepadScope autoFocus><button data-gp-initial="true">Launch</button></GamepadScope>}</GamepadNavProvider>;
	}
	render(<Harness />);
	screen.getByRole('button', { name: 'Open' }).focus();
	await user.keyboard('{ArrowDown}');
	scroll.mockClear();
	await user.keyboard('{Enter}');
	await waitFor(() => expect(screen.getByRole('button', { name: 'Launch' })).toHaveFocus());
	expect(scroll).toHaveBeenCalled();
});

it('leaves horizontal editing keys with a native text input', async () => {
	const user = userEvent.setup();
	const onArrow = vi.fn(() => true);
	render(<GamepadNavProvider><GamepadScope onArrow={onArrow}><input aria-label="Callsign" defaultValue="FB" /></GamepadScope></GamepadNavProvider>);
	const input = screen.getByRole('textbox', { name: 'Callsign' });
	await user.click(input);
	await user.keyboard('{ArrowLeft}{ArrowRight}');
	expect(onArrow).not.toHaveBeenCalled();
	expect(input).toHaveFocus();
});

it('steps a focused range control through the common directional path', async () => {
	const user = userEvent.setup();
	render(<GamepadNavProvider><GamepadScope><input aria-label="Throttle" type="range" min="0" max="10" step="2" defaultValue="4" /></GamepadScope></GamepadNavProvider>);
	const range = screen.getByRole('slider', { name: 'Throttle' }) as HTMLInputElement;
	await user.click(range);
	await user.keyboard('{ArrowRight}');
	expect(range.value).toBe('6');
	await user.keyboard('{ArrowLeft}');
	expect(range.value).toBe('4');
});
