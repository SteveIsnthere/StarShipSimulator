/**
 * Fly: the scenarios as cards, grouped by the part of a flight they start in.
 *
 * Choosing one FILLS Flight setup rather than flying it (tools.js:230, and
 * tests/e2e/menu.spec.ts "a preset fills the form without flying it"): a
 * scenario is a starting point the player can still edit, and Start flight is
 * the one control that flies. The card the form is based on reads as selected.
 */
import { Eyebrow } from '@ui/Eyebrow';
import { Tile } from '@ui/Tile';
import type { ScenarioPreset } from '$core/scenarios';
import { scenarioStats } from '$ui/guide';
import { presetTestId } from '$ui/testids';
import { SCENARIO_GROUPS } from './scenarios';

export interface FlySectionProps {
  /** The preset the form was last filled from. */
  selectedId: string;
  onPick: (preset: ScenarioPreset) => void;
}

export function FlySection({ selectedId, onPick }: FlySectionProps) {
  return (
    <div className="flex flex-col gap-5">
      {SCENARIO_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <Eyebrow as="h3">{group.label}</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.presets.map((preset) => (
              <Tile
                key={preset.id}
                data-preset={preset.id}
                data-testid={presetTestId(preset.id)}
                aria-current={preset.id === selectedId || undefined}
                selected={preset.id === selectedId}
                onClick={() => onPick(preset)}
                className="w-full gap-1 p-3"
              >
                <span className="text-[14px] font-semibold">{preset.name}</span>
                <span className="text-[12px] leading-4 text-ui-muted group-data-[selected=true]:text-ui-on-selected">
                  {preset.description}
                </span>
                <span className="font-mono text-[11px] text-ui-muted group-data-[selected=true]:text-ui-on-selected">
                  {scenarioStats(preset)}
                </span>
              </Tile>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
