import type { ReactNode, RefObject } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { GamepadScope } from '@ui/input';
import { cn } from '@ui/internal/utils';

export interface PopoverProps {
	open: boolean;
	onClose: () => void;
	anchorRef: RefObject<HTMLElement | null>;
	children: ReactNode;
	width?: number;
	align?: 'center' | 'start' | 'end';
	ariaLabel?: string;
	testId?: string;
	className?: string;
	portalContainer?: HTMLElement | null;
}

export function Popover({ open, onClose, anchorRef, children, width = 420, align = 'center', ariaLabel, testId, className, portalContainer }: PopoverProps) {
	return (
		<PopoverPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose(); }} modal={false}>
			<PopoverPrimitive.Anchor virtualRef={anchorRef} />
			{open && <PopoverPrimitive.Portal container={portalContainer}>
				<GamepadScope onBack={onClose} autoFocus>
					<PopoverPrimitive.Content
						role="dialog"
						aria-label={ariaLabel}
						data-testid={testId}
						align={align}
						sideOffset={8}
						collisionPadding={8}
						className={cn('ui-overlay-panel z-[var(--z-overlay-portal)] flex max-h-[min(560px,var(--radix-popover-content-available-height))] flex-col overflow-hidden rounded-ui-sheet text-ui-fg animate-[dialog-enter_120ms_ease-out]', className)}
						style={{ width: `min(${width}px, calc(100vw - 16px))` }}
						onCloseAutoFocus={event => {
							event.preventDefault();
							anchorRef.current?.focus({ preventScroll: true });
						}}
					>
						{children}
					</PopoverPrimitive.Content>
				</GamepadScope>
			</PopoverPrimitive.Portal>}
		</PopoverPrimitive.Root>
	);
}
