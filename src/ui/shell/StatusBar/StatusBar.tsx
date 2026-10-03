/**
 * The status bar: one row across the top at every width (ia.md).
 *
 *   left     the wordmark, the scenario, the autopilot mode in charge
 *   centre   the mission clock
 *   right    Pause, Cinematic, Sound, Black box, Menu
 *
 * On a phone in portrait the row keeps every control and drops the words: the
 * clock moves left with the autopilot mode under it, and the buttons become
 * icons with the same names. The clock is one element in one place at every
 * width — the HUD binder resolves it once — so the layout moves it with grid
 * placement, never by rendering it somewhere else.
 *
 * In cinematic mode the camera selector appears with it (see CameraModes).
 */
import { Clapperboard, Menu as MenuIcon, Pause, Volume2, VolumeX, Activity } from 'lucide-react';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from '../session-context';
import { usePhoneLayout } from '../layout';
import { CameraModes } from './CameraModes';
import { ChromeButton } from './ChromeButton';
import { MissionClock } from './MissionClock';
import { autopilotLabel, scenarioLabel } from '$hud/autopilot-mode';

const ICON = 'size-4';

export function StatusBar() {
  const session = useSession();
  const phone = usePhoneLayout();
  const preset = useSessionState((s) => s.preset);
  const paused = useSessionState((s) => s.playerPaused);
  const cinematic = useSessionState((s) => s.cinematic);
  const muted = useSessionState((s) => s.muted);
  const mode = useSessionState((s) => s.autopilot);
  const vehicle = useSessionState((s) => s.selectedVehicle);

  return (
    <>
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-20 box-content grid items-center border-b border-flight-backing-line bg-flight-backing pt-[env(safe-area-inset-top,0px)] text-ui-fg',
          phone
            ? 'h-[52px] grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] content-center gap-x-2 gap-y-1 px-3'
            : 'h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-4 px-4',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center',
            phone ? 'col-start-1 row-start-2 gap-2' : 'col-start-1 row-start-1 gap-3.5',
          )}
        >
          {!phone && (
            <span className="shrink-0 font-tight text-[13px] font-semibold uppercase leading-none tracking-[0.18em]">
              Starship
            </span>
          )}
          {!phone && (
            <span className="min-w-0 truncate text-[12px] leading-none text-ui-muted">{scenarioLabel(preset)}</span>
          )}
          <span
            className={cn(
              'shrink-0 truncate font-mono uppercase leading-none tracking-[0.1em]',
              phone ? 'text-[10px] text-ui-muted' : 'text-[11px] text-ui-fg',
            )}
          >
            {mode !== 'manual' && (
              <span className={cn(phone && 'sr-only')}>
                Autopilot<span aria-hidden="true"> · </span>
              </span>
            )}
            {autopilotLabel(mode, vehicle)}
          </span>
        </div>

        <MissionClock className={phone ? 'col-start-1 row-start-1' : 'col-start-2 row-start-1 justify-center'} />

        <div
          className={cn(
            'flex items-center justify-end',
            phone ? 'col-start-2 row-span-2 row-start-1 gap-1' : 'col-start-3 row-start-1 gap-1.5',
          )}
        >
          <ChromeButton
            label="Pause"
            testId="pause-toggle"
            icon={<Pause aria-hidden="true" className={ICON} />}
            keyHint={phone ? undefined : 'P'}
            show={phone ? 'icon' : 'label'}
            primary
            pressed={paused}
            onClick={() => session.togglePause()}
          />
          <ChromeButton
            label="Cinematic"
            icon={<Clapperboard aria-hidden="true" className={ICON} />}
            testId="cinematic-toggle"
            show={phone ? 'icon' : 'icon-then-label'}
            pressed={cinematic}
            onClick={() => session.toggleCinematic()}
          />
          <ChromeButton
            label="Sound"
            icon={
              muted ? <VolumeX aria-hidden="true" className={ICON} /> : <Volume2 aria-hidden="true" className={ICON} />
            }
            testId="mute-toggle"
            show={phone ? 'icon' : 'icon-then-label'}
            pressed={!muted}
            fillWhenPressed={false}
            onClick={() => session.toggleMuted()}
          />
          <ChromeButton
            label="Black box"
            icon={<Activity aria-hidden="true" className={ICON} />}
            testId="open-black-box"
            show={phone ? 'icon' : 'icon-then-label'}
            onClick={() => session.openLayer('blackBox')}
          />
          <ChromeButton
            label="Menu"
            icon={<MenuIcon aria-hidden="true" className={ICON} />}
            testId="open-menu"
            keyHint={phone ? undefined : 'Esc'}
            show={phone ? 'icon' : 'label'}
            primary
            onClick={() => session.openLayer('menu')}
          />
        </div>
      </header>

      {cinematic && <CameraModes phone={phone} />}
    </>
  );
}
