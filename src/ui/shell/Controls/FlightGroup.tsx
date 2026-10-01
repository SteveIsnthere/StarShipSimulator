/**
 * Flight: the yoke, the autopilot as one segmented choice, then Systems
 * (docs/design/ia.md, "Controls, grouped by how often they are used").
 *
 * The autopilot modes are still one button each,
 * each with its own test id and event — `$ui/guide`'s table, so the buttons and
 * the guide cannot disagree — laid out as a segmented choice with Manual first.
 * Manual has no event of its own: it is current when no mode is, and choosing
 * it switches off whichever mode is.
 */
import type { ControlEvent } from '$app/controls';
import { AUTOPILOT_MODES } from '$ui/guide';
import { useSession } from '../session-context';
import { ControlButton } from './ControlButton';
import { CommandSlider } from './CommandSlider';
import { MANUAL_PROPS } from './indicators';
import { readYoke, useCommandValue } from './useCommandValue';
import { CONTROL, LIT, SEGMENT } from './styles';

/**
 * The player's words for the modes (docs/design/design-system.md §3). Keyed by
 * test id so `$ui/guide` stays the one list of modes; a mode missing here falls
 * back to the guide's label rather than disappearing.
 */
const MODE_LABELS: Readonly<Record<string, string>> = {
  'auto-take-off': 'Lift off',
  'boost-back': 'Boost back',
  'pitch-hold': 'Hold attitude',
  'auto-land': 'Land',
  'auto-deorbit': 'Deorbit',
};

const SYSTEMS: ReadonlyArray<{ label: string; event: ControlEvent; indicator: string; testid: string }> = [
  { label: 'Fins', event: { type: 'fins' }, indicator: 'fins', testid: 'fins' },
  { label: 'Reaction control', event: { type: 'rcs' }, indicator: 'rcs', testid: 'rcs' },
  { label: 'Dump propellant', event: { type: 'dumpFuel' }, indicator: 'dumpFuel', testid: 'dump-fuel' },
];

/** -100 is full left, as A and the left arrow command it. */
export function yokeText(percent: number): string {
  if (percent === 0) return 'Centre';
  return `${percent < 0 ? 'Left' : 'Right'} ${Math.abs(percent)} %`;
}

export interface FlightGroupProps {
  /** A layer is open over the flight: the yoke cannot be moved. */
  blocked: boolean;
  /** Manual: switch off whichever autopilot mode is on. */
  onManual(): void;
}

export function FlightGroup({ blocked, onManual }: FlightGroupProps) {
  const session = useSession();
  const yoke = useCommandValue(readYoke);

  /*
    switches.js:2 and :8. Grabbing the yoke suspends attitude hold; letting go
    adopts whatever attitude the vehicle now has. The yoke does not spring back
    to centre on release — 2021 left it where the pilot let go.
  */
  const grab = () => session.emit({ type: 'yokeGrab' });
  const release = () => session.emit({ type: 'yokeRelease' });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <CommandSlider
        label="Attitude"
        value={yoke.value}
        min={-100}
        max={100}
        valueText={yokeText(yoke.value)}
        origin="centre"
        disabled={blocked}
        testid="yoke-pitch"
        onChange={(percent) => {
          yoke.set(percent);
          session.emit({ type: 'pitch', percent });
        }}
        onPointerEnter={yoke.resync}
        onPointerDown={grab}
        onPointerUp={release}
        onPointerCancel={release}
        onMouseOver={grab}
        onMouseOut={release}
        onFocus={() => {
          yoke.resync();
          grab();
        }}
        onBlur={release}
      />

      <div role="group" aria-label="Autopilot" className="grid grid-cols-3 gap-px border border-ui-line/70 bg-ui-line/30">
        <button type="button" className={SEGMENT} aria-pressed={true} {...MANUAL_PROPS} onClick={onManual}>
          Manual
        </button>
        {AUTOPILOT_MODES.map((mode) => (
          <ControlButton
            key={mode.testid}
            event={mode.event}
            indicator={mode.indicator}
            testid={mode.testid}
            className={SEGMENT}
          >
            {MODE_LABELS[mode.testid] ?? mode.label}
          </ControlButton>
        ))}
      </div>

      <div role="group" aria-label="Systems" className="grid grid-cols-3 gap-1.5 border-t border-ui-line/30 pt-2">
        {SYSTEMS.map((system) => (
          <ControlButton
            key={system.testid}
            event={system.event}
            indicator={system.indicator}
            testid={system.testid}
            className={`${CONTROL} ${LIT} justify-center px-1.5 text-center`}
          >
            {system.label}
          </ControlButton>
        ))}
      </div>
    </div>
  );
}
