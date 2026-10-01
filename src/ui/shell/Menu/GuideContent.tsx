/**
 * The guide.
 *
 * GENERATED WHERE IT CAN BE: the keys from `KEY_BINDINGS`, the autopilot modes
 * from `AUTOPILOT_MODES` (the table the controls render), the scenarios from
 * `GUIDE_SCENARIOS` with the menu's own stat line. 2021's guide was prose kept
 * by hand beside the code and had drifted from it; a help screen that can lie
 * is worse than none. The only prose is what no table knows.
 *
 * The `data-guide`, `data-mode` and `data-scenario` hooks are read by
 * tests/e2e/hint.spec.ts.
 */
import { Fragment } from 'react';
import { KeyCap } from '@ui/KeyCap';
import { KEY_BINDINGS } from '$app/input';
import { AUTOPILOT_MODES, GUIDE_SCENARIOS, scenarioStats } from '$ui/guide';
import { InfoPart } from './InfoPart';

export function GuideContent() {
  return (
    <>
      <InfoPart title="Basics">
        <p className="mb-3">
          Touch, mouse, keyboard or gamepad: every control can be reached with any of them.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <b className="text-ui-fg">Engines</b>: light all three at once or each on its own, and set
            the throttle with its slider. The throttle guard holds the throttle at whatever keeps the
            vehicle inside its dynamic-pressure limit.
          </li>
          <li>
            <b className="text-ui-fg">Flight</b>: attitude pitches the nose. Below it, the autopilot,
            then the fins, reaction control and dumping propellant.
          </li>
          <li>
            <b className="text-ui-fg">Menu</b>: pick a scenario, edit where the flight starts, and change
            settings. The flight pauses while it is open.
          </li>
        </ul>
      </InfoPart>

      <InfoPart title="Keys">
        <table className="w-full border-collapse">
          <tbody>
            {KEY_BINDINGS.map((binding) => (
              <tr key={binding.does} className="border-b border-ui-line-muted last:border-b-0">
                <td className="w-px whitespace-nowrap py-1.5 pr-4 align-top">
                  {binding.keys.map((key, i) => (
                    <Fragment key={key}>
                      {i > 0 && <span className="px-1 text-ui-muted">/</span>}
                      <KeyCap>{key}</KeyCap>
                    </Fragment>
                  ))}
                </td>
                <td className="py-1.5 align-top">{binding.does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </InfoPart>

      <InfoPart title="Autopilot">
        <ul data-guide="autopilot" className="flex flex-col gap-2">
          {AUTOPILOT_MODES.map((mode) => (
            <li key={mode.testid} data-mode={mode.testid}>
              <b className="text-ui-fg">{mode.label}</b> — {mode.does}
            </li>
          ))}
        </ul>
      </InfoPart>

      <InfoPart title="Flights you can start from">
        <table data-guide="scenarios" className="mb-3 w-full border-collapse">
          <tbody>
            {GUIDE_SCENARIOS.map((preset) => (
              <tr key={preset.id} data-scenario={preset.id} className="border-b border-ui-line-muted last:border-b-0">
                <td className="w-px whitespace-nowrap py-1.5 pr-4 align-top font-medium text-ui-fg">{preset.name}</td>
                <td className="py-1.5 align-top font-mono text-[12px]">{scenarioStats(preset)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Each is a starting point rather than a fixed flight: choosing one fills Flight setup, and
          Start flight flies whatever the fields say.
        </p>
      </InfoPart>

      <InfoPart title="Played Kerbal Space Program?">
        <p>Then you are ready: the keys are the same. Have fun.</p>
      </InfoPart>
    </>
  );
}
