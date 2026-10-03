/** New booster/mission flights reserve the measured HUD zone. The protected
 * standalone Ship canvas retains its original full-height framing. */
import type { RefObject } from 'react';
import { useSessionState } from './session-context';

export function FlightWorld({ canvas }: { canvas: RefObject<HTMLCanvasElement | null> }) {
  const model = useSessionState(s => s.selectedVehicle);
  const mission = useSessionState(s => s.missionPhase !== null);
  return (
    <div className={`fixed inset-x-0 bottom-[var(--controls-bottom,0px)] ${mission || model === 'super-heavy' ? 'top-[var(--hud-bottom,220px)]' : 'top-0'}`}>
      <canvas ref={canvas} data-testid="world-canvas" className="block h-full w-full" />
    </div>
  );
}
