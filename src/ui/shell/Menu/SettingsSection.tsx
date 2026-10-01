/**
 * Settings: sound, time warp, the two flight settings, and Restore defaults.
 *
 * THE VOLUME IS REMEMBERED ONLY WHEN THE FINGER COMES OFF (Menu.svelte,
 * commitVolume). The sound follows every step of a drag (`input`,
 * remember=false), and the level is written to storage once, on the native
 * `change` event, because `localStorage.setItem` is synchronous and a drag is a
 * hundred of them. React's onChange is the `input` event, so `change` is
 * listened for natively on the slider's wrapper (it bubbles).
 *
 * Mute is its own switch beside the level: a level of zero is quiet, not off,
 * and the state is the same one the status bar's Sound shows, under the
 * opposite name (pressed when sound is off).
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import { SliderRow } from '@ui/SliderRow';
import { describeTimeSetting, MAX_TIME_RATE, MIN_TIME_RATE } from '$app/menu';
import { useSession, useSessionState } from '../session-context';
import { PressToggle } from './PressToggle';

/**
 * tests/e2e/menu.spec.ts reads the time warp readout by its legacy
 * `data-menu-readout` attribute, which the kit's SliderRow cannot carry, so it
 * is stamped onto the readout SliderRow renders. Remove once the spec reads
 * `menu-time-readout` by test id, as tests/e2e/shake.spec.ts already does.
 */
function stampLegacyTimeReadout(wrapper: HTMLDivElement | null): void {
  wrapper?.querySelector('[data-testid="menu-time-readout"]')?.setAttribute('data-menu-readout', 'timeRate');
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow as="h3">{title}</Eyebrow>
      {children}
    </div>
  );
}

export function SettingsSection() {
  const session = useSession();
  const muted = useSessionState((s) => s.muted);
  const volume = useSessionState((s) => s.volume);
  const time = useSessionState((s) => s.time);
  const randomFailure = useSessionState((s) => s.randomFailure);
  const tiltControl = useSessionState((s) => s.tiltControl);
  const volumeSlider = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = volumeSlider.current;
    if (!wrapper) return;
    const commit = (event: Event) => {
      if (event.target instanceof HTMLInputElement) session.setVolume(event.target.valueAsNumber / 100, true);
    };
    wrapper.addEventListener('change', commit);
    return () => wrapper.removeEventListener('change', commit);
  }, [session]);

  // Whole percent, in the readout and in the slider's own units, so the two never disagree.
  const percent = Math.round(volume * 100);

  return (
    <div className="flex flex-col gap-6">
      <Group title="Sound">
        <div ref={volumeSlider}>
          <SliderRow
            label="Volume"
            value={percent}
            min={0}
            max={100}
            step={1}
            format={(level) => (muted ? 'Muted' : `${level}%`)}
            onChange={(level) => session.setVolume(level / 100, false)}
            data-testid="menu-volume"
            valueTestId="menu-volume-readout"
          />
        </div>
        <PressToggle
          testId="menu-mute"
          label="Mute"
          description="Silences every sound. The level above is kept."
          pressed={muted}
          onToggle={() => session.toggleMuted()}
        />
      </Group>

      <Group title="Time">
        <div ref={stampLegacyTimeReadout}>
          <SliderRow
            label="Time warp"
            value={time.rate}
            min={MIN_TIME_RATE}
            max={MAX_TIME_RATE}
            step={1}
            format={(rate) => describeTimeSetting({ rate, speedingUp: time.speedingUp })}
            onChange={(rate) => session.setTime({ rate, speedingUp: time.speedingUp })}
            data-testid="menu-time-rate"
            valueTestId="menu-time-readout"
          />
        </div>
        <PressToggle
          testId="menu-time-direction"
          label="Slow motion"
          description="Runs the flight slower than real time instead of faster."
          pressed={!time.speedingUp}
          onToggle={() => session.setTime({ rate: time.rate, speedingUp: !time.speedingUp })}
        />
      </Group>

      <Group title="Flight">
        <PressToggle
          testId="menu-random-failure"
          label="Random engine failures"
          description="An engine can fail at any moment. Carries into every new flight."
          pressed={randomFailure}
          onToggle={() => session.toggleRandomFailure()}
        />
        <PressToggle
          testId="menu-tilt-control"
          label="Tilt control"
          description="On a phone or tablet, tilt the device to steer."
          pressed={tiltControl}
          onToggle={() => session.toggleTiltControl()}
        />
      </Group>

      <Group title="Reset">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="button" data-testid="menu-restore-defaults" onClick={() => session.restoreDefaults()}>
            Restore defaults
          </Button>
          <p className="min-w-0 flex-1 basis-60 text-[12px] leading-4 text-ui-muted">
            Sound, the camera, cinematic mode, the map and the first-flight tips go back to how a first
            visit starts. Closes the menu.
          </p>
        </div>
      </Group>
    </div>
  );
}
