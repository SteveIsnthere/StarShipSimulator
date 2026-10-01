import { useRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useChipPanelMorph } from './useChipPanelMorph';

let reduced = false;

beforeEach(() => {
	reduced = false;
	vi.stubGlobal('matchMedia', () => ({
		get matches() { return reduced; },
		media: '(prefers-reduced-motion: reduce)',
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
	// jsdom has no layout; give every element a box so focus helpers see it as visible.
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: Element) {
		const panel = this.getAttribute('data-testid') === 'panel';
		const box = panel ? { left: 0, top: 0, width: 400, height: 120 } : { left: 300, top: 140, width: 60, height: 24 };
		return { ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height, toJSON: () => ({}) } as DOMRect;
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function Harness({ open }: { open: boolean }) {
	const anchorRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const shellRef = useRef<HTMLDivElement>(null);
	const present = useChipPanelMorph({ open, anchorRef, panelRef, shellRef });
	return (
		<div>
			<button ref={anchorRef} aria-expanded={open}>Chip</button>
			<button>Elsewhere</button>
			{present && (
				<>
					<div ref={shellRef} data-testid="shell" />
					<div ref={panelRef} data-testid="panel">
						<button>First</button>
						<button>Second</button>
					</div>
				</>
			)}
		</div>
	);
}

const chip = () => screen.getByRole('button', { name: 'Chip' });
const panel = () => screen.queryByTestId('panel');

function expectSettledOpen() {
	const el = panel();
	expect(el).not.toBeNull();
	expect(el!.style.opacity).toBe('');
	expect(el!.style.clipPath).toBe('');
	expect(el!.inert).toBe(false);
	expect(el!.style.backgroundColor).toBe('');
	expect(el!.style.borderColor).toBe('');
	expect(el!.dataset.morphing).toBeUndefined();
	expect(screen.getByTestId('shell').style.visibility).toBe('hidden');
}

it('mounts at once, hands the frame to the shell and settles after the expansion', async () => {
	const { rerender } = render(<Harness open={false} />);
	chip().focus();
	rerender(<Harness open />);
	// The panel is laid out immediately, its own frame handed to the shell so the two never stack.
	expect(panel()).not.toBeNull();
	expect(panel()!.style.backgroundColor).toBe('transparent');
	expect(panel()!.style.borderColor).toBe('transparent');
	// Content is hidden until the shape settles.
	expect(panel()!.style.opacity).toBe('0');
	expect(screen.getByTestId('shell').style.visibility).toBe('visible');
	await waitFor(expectSettledOpen);
});

it('returns focus to the chip as the collapse starts and unmounts when it lands', async () => {
	const { rerender } = render(<Harness open />);
	screen.getByRole('button', { name: 'Second' }).focus();
	rerender(<Harness open={false} />);
	expect(chip()).toHaveFocus();
	// Still present and inert while it collapses.
	expect(panel()).not.toBeNull();
	expect(panel()!.inert).toBe(true);
	await waitFor(() => expect(panel()).toBeNull());
	expect(chip()).toHaveFocus();
});

it('does not steal focus from elsewhere when the panel is closed programmatically', async () => {
	const { rerender } = render(<Harness open />);
	screen.getByRole('button', { name: 'Elsewhere' }).focus();
	rerender(<Harness open={false} />);
	expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
	await waitFor(() => expect(panel()).toBeNull());
});

it('opens and closes instantly under reduced motion', () => {
	reduced = true;
	const { rerender } = render(<Harness open={false} />);
	chip().focus();
	rerender(<Harness open />);
	expectSettledOpen();
	screen.getByRole('button', { name: 'First' }).focus();
	rerender(<Harness open={false} />);
	expect(panel()).toBeNull();
	expect(chip()).toHaveFocus();
});

it('ends open and consistent after a rapid open, close, open', async () => {
	const { rerender } = render(<Harness open={false} />);
	chip().focus();
	rerender(<Harness open />);
	rerender(<Harness open={false} />);
	expect(chip()).toHaveFocus();
	rerender(<Harness open />);
	await waitFor(expectSettledOpen);
	// Nothing left over fires later and closes or hides it.
	await act(() => new Promise(resolve => setTimeout(resolve, 300)));
	expectSettledOpen();
});

it('ends closed and unmounted after a rapid close, open, close', async () => {
	const { rerender } = render(<Harness open />);
	rerender(<Harness open={false} />);
	rerender(<Harness open />);
	rerender(<Harness open={false} />);
	await waitFor(() => expect(panel()).toBeNull());
	await act(() => new Promise(resolve => setTimeout(resolve, 300)));
	expect(panel()).toBeNull();
	// No leftover tween corrupted the state: the next open animates again.
	rerender(<Harness open />);
	expect(panel()!.style.opacity).toBe('0');
	expect(screen.getByTestId('shell').style.visibility).toBe('visible');
	await waitFor(expectSettledOpen);
});

it('kills the motion when unmounted mid-flight', async () => {
	const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	const { rerender, unmount } = render(<Harness open={false} />);
	rerender(<Harness open />);
	unmount();
	await act(() => new Promise(resolve => setTimeout(resolve, 300)));
	expect(errors).not.toHaveBeenCalled();
});
