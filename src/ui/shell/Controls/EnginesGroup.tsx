/**
 * Engines: the sea-level three on or off, each of the six, the throttle, and the guard
 * (docs/design/ia.md, "Controls, grouped by how often they are used").
 *
 * The throttle is bounded by the engines'
 * limits — not 0..100 — exactly as core clamps it, and it emits on every input.
 */
import { useId } from 'react';
import { Eyebrow } from '@ui/Eyebrow';
import { KeyCap } from '@ui/KeyCap';
import { RAPTORS, throttleLowerLimit, throttleUpperLimit } from '$core/constants';
import type { RaptorIndex } from '$core/state';
import { useSession } from '../session-context';
import { ControlButton } from './ControlButton';
import { CommandSlider } from './CommandSlider';
import { readThrottle, useCommandValue } from './useCommandValue';
import { CONTROL, ENGINE, LIT, STATE_WORD } from './styles';

/** The engines in their two sets, each with its visible label and the word its buttons are named with. */
const ENGINE_SETS = [
  { kind: 'sea-level', label: 'SL', name: 'Sea-level engine' },
  { kind: 'vacuum', label: 'Vac', name: 'Vacuum engine' },
] as const;

const enginesOf = (kind: (typeof ENGINE_SETS)[number]['kind']): readonly RaptorIndex[] =>
  RAPTORS.flatMap((m, i) => (m.kind === kind ? [i] : []));

/**
 * An engine reads lit by fill (a solid square) and off by its absence (an
 * outline), so it never depends on brightness alone. The binder's `allRaptors`
 * indicator is what flips the throttle's value to Off, through the group's
 * `:has()` — no React state, no per-frame work.
 */
const ENGINE_DOT = 'block size-3 border border-ui-fg in-[[aria-pressed=true]]:bg-ui-fg';
const THROTTLE_LIVE = 'group-has-[[data-indicator=allRaptors][aria-pressed=true]]/engines:inline hidden';
const THROTTLE_OFF = 'group-has-[[data-indicator=allRaptors][aria-pressed=true]]/engines:hidden';

/** The guard's one line, on hover and to assistive technology. */
const GUARD_HINT = 'Throttles back to keep the speed under the safe dynamic-pressure limit.';

export interface EnginesGroupProps {
  /** A layer is open over the flight: the throttle cannot be moved. */
  blocked: boolean;
}

export function EnginesGroup({ blocked }: EnginesGroupProps) {
  const session = useSession();
  const throttle = useCommandValue(readThrottle);
  const guardHint = useId();

  return (
    <div className="group/engines grid grid-cols-[minmax(0,1fr)] gap-2">
      {/* Wraps rather than squeezing: on a narrow touch rail each set of three 44 px engine dots takes its own row. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ControlButton
          event={{ type: 'allRaptors' }}
          indicator="allRaptors"
          testid="all-raptors"
          className={`${CONTROL} ${LIT} min-w-[5.5rem] flex-1 justify-between px-3`}
        >
          <span>Engines</span>
          <span className="any-pointer-coarse:hidden" aria-hidden="true">
            <KeyCap>Space</KeyCap>
          </span>
        </ControlButton>
        {ENGINE_SETS.map((set) => (
          <div key={set.kind} role="group" aria-label={`${set.name}s`} className="flex items-center">
            <Eyebrow size="sm" tone="muted" className="pr-0.5" aria-hidden="true">
              {set.label}
            </Eyebrow>
            {enginesOf(set.kind).map((engine, n) => (
              <ControlButton
                key={engine}
                event={{ type: 'raptor', engine }}
                indicator={`raptor${engine}`}
                testid={`raptor-${engine}`}
                className={ENGINE}
                aria-label={`${set.name} ${n + 1}`}
                title={`${set.name} ${n + 1} (${engine + 1})`}
              >
                <span className={ENGINE_DOT} aria-hidden="true" />
              </ControlButton>
            ))}
          </div>
        ))}
      </div>

      <CommandSlider
        label="Throttle"
        value={throttle.value}
        min={throttleLowerLimit}
        max={throttleUpperLimit}
        valueText={`${throttle.value} %`}
        readout={
          <>
            <span className={THROTTLE_LIVE}>{throttle.value} %</span>
            <span className={THROTTLE_OFF}>Off</span>
          </>
        }
        origin="start"
        disabled={blocked}
        testid="throttle"
        onPointerEnter={throttle.resync}
        onFocus={throttle.resync}
        onChange={(percent) => {
          throttle.set(percent);
          session.emit({ type: 'throttle', percent });
        }}
      />

      <ControlButton
        event={{ type: 'autoMaxThrust' }}
        indicator="autoMaxThrust"
        testid="auto-max-thrust"
        className={`${CONTROL} ${LIT} w-full justify-between px-3`}
        title={GUARD_HINT}
        aria-describedby={guardHint}
      >
        <span>Throttle guard</span>
        <span className={STATE_WORD} aria-hidden="true">
          <span className="in-[[aria-pressed=true]]:hidden">Off</span>
          <span className="hidden in-[[aria-pressed=true]]:inline">On</span>
        </span>
      </ControlButton>
      <span id={guardHint} className="sr-only">
        {GUARD_HINT}
      </span>
    </div>
  );
}
