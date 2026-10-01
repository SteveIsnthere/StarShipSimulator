/**
 * A labelled command slider with its value: the throttle and the yoke.
 *
 * Not the kit's SliderRow, for two reasons that are both behaviour: the yoke
 * has to see the pointer and focus on the input itself (grabbing it suspends
 * attitude hold, letting go resumes it), and the throttle's value reads *Off*
 * while the engines are off, which is the indicator binder's state and so has
 * to be a node CSS can switch rather than a formatted string. The look follows
 * SliderRow's: a measured fill on a thin rail, a square thumb.
 */
import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';

type InputEvents = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'onPointerEnter' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onMouseOver' | 'onMouseOut' | 'onFocus' | 'onBlur'
>;

export interface CommandSliderProps extends InputEvents {
  label: string;
  value: number;
  min: number;
  max: number;
  /** The value as words, for assistive technology. */
  valueText: string;
  /** What shows beside the label. Defaults to `valueText`. */
  readout?: ReactNode;
  /** Where the fill starts: the left end (throttle) or the centre (yoke). */
  origin: 'start' | 'centre';
  disabled: boolean;
  onChange(value: number): void;
  testid: string;
}

const RAIL = 'var(--color-flight-rail)';
const FILL = 'var(--color-ui-fg)';

function fill(value: number, min: number, max: number, origin: CommandSliderProps['origin']): CSSProperties {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const from = origin === 'start' ? 0 : Math.min(50, pct);
  const to = origin === 'start' ? pct : Math.max(50, pct);
  return {
    background: `linear-gradient(to right, ${RAIL} ${from}%, ${FILL} ${from}% ${to}%, ${RAIL} ${to}%) center / 100% 4px no-repeat`,
  };
}

/** Disabled: the rail alone. A measured fill would claim a command that cannot be given. */
const DORMANT: CSSProperties = { background: `linear-gradient(${RAIL}, ${RAIL}) center / 100% 4px no-repeat` };

const INPUT = [
  'ui-target block w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed',
  '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ui-bg [&::-webkit-slider-thumb]:bg-ui-fg',
  '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ui-bg [&::-moz-range-thumb]:bg-ui-fg',
  'any-pointer-coarse:[&::-webkit-slider-thumb]:size-[22px] any-pointer-coarse:[&::-moz-range-thumb]:size-[22px]',
  'disabled:[&::-webkit-slider-thumb]:bg-ui-disabled-fg disabled:[&::-moz-range-thumb]:bg-ui-disabled-fg',
].join(' ');

export function CommandSlider({
  label,
  value,
  min,
  max,
  valueText,
  readout,
  origin,
  disabled,
  onChange,
  testid,
  ...events
}: CommandSliderProps) {
  const id = useId();
  return (
    <div className="grid gap-0.5">
      {/* A 44 px target is mostly air around a 4 px rail; the label row may sit in it. */}
      <div className="flex items-baseline justify-between gap-3 any-pointer-coarse:-mb-2">
        <label htmlFor={id} className="text-[12.5px] text-ui-fg">
          {label}
        </label>
        <span className="font-mono text-[13px] tabular-nums text-ui-fg" aria-hidden="true">
          {readout ?? valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={valueText}
        disabled={disabled}
        data-testid={testid}
        className={INPUT}
        style={disabled ? DORMANT : fill(value, min, max, origin)}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        {...events}
      />
    </div>
  );
}
