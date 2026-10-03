/** Interaction-only body selection; the session owns both physical histories. */
import { Button } from '@ui/Button';
import { TabStrip } from '@ui/TabStrip';
import { useSession, useSessionState } from '../session-context';

export function MissionControls({ blocked }: { blocked: boolean }) {
  const session = useSession();
  const selected = useSessionState(s => s.selectedVehicle);
  const phase = useSessionState(s => s.missionPhase);
  const requested = useSessionState(s => s.stageRequested);
  const failed = useSessionState(s => s.stagingFailed);
  if (phase === null) return <span className="text-[12px] text-ui-muted">{selected === 'ship' ? 'Ship' : 'Super Heavy'}</span>;
  return (
    <div className="grid gap-2 border-b border-ui-line-muted pb-2">
      <TabStrip aria-label="Vehicle to fly">
        <TabStrip.Tab testId="select-ship" active={selected === 'ship'} onClick={() => session.selectVehicle('ship')}>Ship</TabStrip.Tab>
        <TabStrip.Tab testId="select-super-heavy" active={selected === 'super-heavy'} onClick={() => session.selectVehicle('super-heavy')}>Super Heavy</TabStrip.Tab>
      </TabStrip>
      <div className="flex items-center justify-between gap-2">
        <span role="status" className="text-[12px] text-ui-muted">
          {failed ? 'Stage failed' : phase === 'separated' ? 'Separated' : requested ? 'Starting engines' : 'Attached'}
        </span>
        {phase === 'attached' && <Button type="button" data-testid="stage" disabled={blocked || requested || failed} onClick={() => session.stage()}>Stage</Button>}
      </div>
    </div>
  );
}
