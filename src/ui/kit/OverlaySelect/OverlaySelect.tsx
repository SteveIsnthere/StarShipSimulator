import { useMemo, useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { Eyebrow } from '@ui/Eyebrow';
import { GamepadScope } from '@ui/input';
import { cn } from '@ui/internal/utils';

export interface OverlaySelectOption {
	value: string;
	label: string;
	secondaryText?: string;
	disabled?: boolean;
}

export interface OverlaySelectProps {
	value: string;
	onChange: (value: string) => void;
	options: OverlaySelectOption[];
	placeholder?: string;
	dataTestId?: string;
	menuTestId?: string;
	ariaLabel?: string;
	variant?: 'default' | 'compact' | 'card';
	eyebrow?: string;
	muted?: boolean;
	showSecondary?: boolean;
	triggerClassName?: string;
	menuClassName?: string;
	emptyText?: string;
	portalContainer?: HTMLElement | null;
}

export function OverlaySelect({
	value,
	onChange,
	options,
	placeholder = 'Select',
	dataTestId,
	menuTestId,
	ariaLabel,
	variant = 'default',
	eyebrow,
	muted = false,
	showSecondary = true,
	triggerClassName,
	menuClassName,
	emptyText = 'No options available',
	portalContainer,
}: OverlaySelectProps) {
	const [open, setOpen] = useState(false);
	const selected = useMemo(() => options.find(option => option.value === value) ?? null, [options, value]);
	const resolvedMenuTestId = menuTestId ?? (dataTestId ? `${dataTestId}-menu` : undefined);
	const handleGamepadArrow = (direction: 'up' | 'down' | 'left' | 'right') => {
		if (direction !== 'up' && direction !== 'down') return false;
		const target = document.activeElement;
		if (!(target instanceof HTMLElement)) return false;
		target.dispatchEvent(new KeyboardEvent('keydown', {
			key: direction === 'up' ? 'ArrowUp' : 'ArrowDown',
			bubbles: true,
		}));
		return true;
	};
	return (
		<SelectPrimitive.Root open={open} onOpenChange={setOpen} value={value} onValueChange={onChange}>
			<SelectPrimitive.Trigger
				aria-label={ariaLabel ?? eyebrow}
				data-testid={dataTestId}
				className={cn(
					variant === 'compact'
						? 'ui-target flex w-full items-center justify-between gap-1.5 rounded-ui-control border border-ui-line-muted bg-ui-surface-sunken px-1.5 py-1 text-[10px] font-mono text-ui-fg transition-colors hover:border-ui-line'
						: variant === 'card'
								? 'ui-target group/trigger flex w-full items-center justify-between gap-3 border border-ui-line-muted bg-ui-bg px-4 py-3 text-left text-ui-fg transition-colors hover:border-ui-line'
								: 'ui-target flex w-full items-center justify-between gap-3 rounded-ui-control border border-ui-line-muted bg-ui-surface-raised px-3 text-sm text-ui-fg transition-colors hover:border-ui-line',
					open && 'border-ui-line',
					triggerClassName,
				)}
			>
				<div className="min-w-0 flex-1 text-left">
					{variant === 'card' && (eyebrow ?? ariaLabel) && <Eyebrow>{eyebrow ?? ariaLabel}</Eyebrow>}
					<div className={cn('truncate', variant === 'card' && 'mt-0.5 text-[15px] font-semibold tracking-tight', variant === 'card' && (muted ? 'text-ui-muted' : 'text-ui-fg'))}>
						{selected?.label ?? <span className="text-ui-dim">{placeholder}</span>}
					</div>
					{showSecondary && selected?.secondaryText && <div className={cn('mt-0.5 truncate', variant === 'card' ? 'text-[12px] text-ui-muted' : 'text-[10px] font-mono text-ui-dim')}>{selected.secondaryText}</div>}
				</div>
				<SelectPrimitive.Icon asChild><ChevronDown size={variant === 'card' ? 16 : 14} strokeWidth={1.8} aria-hidden="true" className={cn('shrink-0 text-ui-dim transition-transform', open && 'rotate-180 text-ui-fg')} /></SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>

			{open && <SelectPrimitive.Portal container={portalContainer}>
					<GamepadScope onBack={() => setOpen(false)} onArrow={handleGamepadArrow} keyboardArrowMode="native" autoFocus>
					<SelectPrimitive.Content
						position="popper"
						sideOffset={6}
						collisionPadding={8}
						data-testid={resolvedMenuTestId}
						className={cn('ui-overlay-panel z-[var(--z-overlay-portal)] max-h-[320px] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-ui-tile', menuClassName)}
					>
						<SelectPrimitive.Viewport className="max-h-[320px] overflow-y-auto">
							{options.length === 0
							? <div className="px-3 py-2 text-sm text-ui-dim">{emptyText}</div>
								: options.map((option, index) => (
									<SelectPrimitive.Item
										key={option.value || `empty-${index}`}
										value={option.value}
										disabled={option.disabled}
										data-gp-initial={option.value === value ? 'true' : undefined}
										data-testid={dataTestId ? `${dataTestId}-option-${option.value}` : undefined}
										className={cn(
											'flex w-full items-center justify-between text-left outline-none transition-colors',
											variant === 'compact' ? 'gap-2 px-2 py-1.5 text-[11px]' : 'gap-3 px-3 py-2 text-sm',
											index > 0 && 'border-t border-ui-line-muted',
											option.value === value ? 'bg-ui-selected text-ui-on-selected' : 'bg-ui-bg text-ui-muted data-[highlighted]:bg-ui-fg data-[highlighted]:text-ui-on-selected',
											'data-[disabled]:border-ui-line-muted data-[disabled]:bg-ui-disabled-bg data-[disabled]:text-ui-disabled-fg data-[disabled]:cursor-not-allowed',
										)}
									>
										<div className="min-w-0 flex-1">
											<SelectPrimitive.ItemText><span className="truncate font-medium">{option.label}</span></SelectPrimitive.ItemText>
											{option.secondaryText && <div className="mt-0.5 truncate text-[10px] font-mono text-current">{option.secondaryText}</div>}
										</div>
										<SelectPrimitive.ItemIndicator><Check size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-current" /></SelectPrimitive.ItemIndicator>
									</SelectPrimitive.Item>
								))}
						</SelectPrimitive.Viewport>
					</SelectPrimitive.Content>
				</GamepadScope>
			</SelectPrimitive.Portal>}
		</SelectPrimitive.Root>
	);
}
