import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@ui/Button';
import { cn } from '@ui/internal/utils';

export interface DialogProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	maxWidth?: string;
	testId?: string;
	ariaLabel?: string;
	closeOnEscape?: boolean;
	portalContainer?: HTMLElement | null;
}

export function Dialog({
	open,
	onClose,
	children,
	maxWidth = '980px',
	testId,
	ariaLabel,
	closeOnEscape = true,
	portalContainer,
}: DialogProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const handleOpenChange = useCallback((next: boolean) => {
		if (!next) onClose();
	}, [onClose]);
	return (
		<DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
			<DialogPrimitive.Portal container={portalContainer}>
				<DialogPrimitive.Overlay
					className="fixed inset-0 z-[var(--z-overlay-portal)] bg-black/80 animate-[fade-in_60ms_ease-out]"
					data-testid={testId ? `${testId}-backdrop` : undefined}
					data-dialog-backdrop
				/>
				<DialogPrimitive.Content
					ref={contentRef}
					aria-label={ariaLabel}
					data-testid={testId}
					className="ui-safe-viewport fixed z-[var(--z-overlay-portal)] mx-auto flex max-w-[var(--dialog-max-w)] flex-col border border-ui-line bg-ui-bg px-5 text-ui-fg animate-[dialog-enter_120ms_ease-out] sm:px-8"
					style={{ '--dialog-max-w': maxWidth } as CSSProperties}
					onClick={event => {
						if ((event.target as HTMLElement).hasAttribute('data-dialog-backdrop')) onClose();
					}}
					onEscapeKeyDown={event => {
						if (!closeOnEscape) event.preventDefault();
					}}
					onOpenAutoFocus={event => {
						returnFocusRef.current = document.activeElement as HTMLElement | null;
						const initial = contentRef.current?.querySelector<HTMLElement>('[data-gp-initial]');
						if (!initial) return;
						event.preventDefault();
						initial.focus({ preventScroll: true });
					}}
					onCloseAutoFocus={event => {
						event.preventDefault();
						if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
						returnFocusRef.current = null;
					}}
				>
					{children}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

export interface DialogHeaderProps {
	title: string;
	onClose: () => void;
	onBack?: () => void;
	trailing?: ReactNode;
}

export function DialogHeader({ title, onBack, trailing }: DialogHeaderProps) {
	return (
		<header className="mb-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center pt-4 sm:pt-6">
			<div className="flex min-w-0 items-center gap-3 justify-self-start">
				{onBack && <Button variant="ghost" size="sm" onClick={onBack} data-testid="detail-back"><ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" /><span>Back</span></Button>}
				{trailing && <div className="flex items-center gap-2">{trailing}</div>}
			</div>
			<DialogPrimitive.Title className="justify-self-center truncate text-[14px] font-medium text-ui-fg">{title}</DialogPrimitive.Title>
			<div className="justify-self-end"><DialogPrimitive.Close asChild><Button variant="ghost" size="icon-sm" data-testid="menu-close" aria-label="Close"><X size={14} strokeWidth={1.8} aria-hidden="true" /></Button></DialogPrimitive.Close></div>
		</header>
	);
}

export interface DialogBodyProps { children: ReactNode; className?: string }
export function DialogBody({ children, className }: DialogBodyProps) {
	return <div data-dialog-backdrop data-gp-body className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin [scrollbar-color:var(--color-ui-line-muted)_transparent]', className)}>{children}</div>;
}

export type DialogContentWidth = 'sm' | 'md' | 'lg' | 'xl';
const WIDTH: Record<DialogContentWidth, string> = { sm: 'max-w-[540px]', md: 'max-w-[640px]', lg: 'max-w-[760px]', xl: 'max-w-[960px]' };
export interface DialogContentProps { width?: DialogContentWidth; className?: string; children: ReactNode }
export function DialogContent({ width = 'md', className, children }: DialogContentProps) {
	return <div className={cn('mx-auto my-auto w-full', WIDTH[width], className)}>{children}</div>;
}
