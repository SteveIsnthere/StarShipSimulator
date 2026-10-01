/**
 * The camera selector: the one thing cinematic mode adds rather than hides.
 *
 * Present only in cinematic mode. With the flight controls gone, it takes their
 * place at the bottom edge: centred on a desktop and a landscape phone, and on
 * a portrait phone the band where the controls' tab bar sits. The top belongs
 * to the primary cluster in every layout.
 */
import type { SessionState } from '$ui/session/store';
import { Button } from '@ui/Button';
import { Eyebrow } from '@ui/Eyebrow';
import { cn } from '@ui/internal/utils';
import { useSession, useSessionState } from '../session-context';

type CameraMode = SessionState['cameraMode'];

/**
 * Every mode, named. A Record over the session's own type, so a mode added to
 * the view without a name here fails the type check rather than going missing.
 * (The shell does not import the view; the session's state carries the type.)
 */
const LABELS: Readonly<Record<CameraMode, string>> = {
  follow: 'Follow',
  pad: 'Pad',
  chase: 'Chase',
  onboard: 'Onboard',
};
const MODES = Object.keys(LABELS) as CameraMode[];

export function CameraModes({ phone }: { phone: boolean }) {
  const session = useSession();
  const current = useSessionState((s) => s.cameraMode);

  return (
    <div
      role="group"
      aria-label="Camera"
      data-testid="camera-modes"
      className={cn(
        'absolute z-20 border-flight-backing-line bg-flight-backing',
        phone
          ? 'ui-safe-margin-bottom inset-x-0 bottom-0 grid h-14 grid-cols-4 items-center gap-1 border-t px-3'
          : // Cinematic hides the controls, so the bottom edge is free; the top holds the cluster.
            'ui-safe-margin-bottom bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 border p-1 pl-3',
      )}
    >
      {!phone && (
        <Eyebrow size="sm" tone="muted" aria-hidden="true" className="mr-2">
          Camera
        </Eyebrow>
      )}
      {MODES.map((mode) => (
        <Button
          key={mode}
          variant="ghost"
          size="sm"
          data-testid={`camera-${mode}`}
          aria-pressed={current === mode}
          onClick={() => session.selectCameraMode(mode)}
          className="text-ui-fg aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected"
        >
          {LABELS[mode]}
        </Button>
      ))}
    </div>
  );
}
