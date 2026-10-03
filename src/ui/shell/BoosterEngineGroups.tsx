/** Both surfaces use the same physical groups and cached numeric binder. */
import { useEffect, useRef } from 'react';
import { Button } from '@ui/Button';
import { BOOSTER_ENGINE_GROUPS } from '$core/vehicles/super-heavy';
import { ENGINE_GROUP_NAMES, ENGINE_GROUP_LABELS } from '$hud/engine-groups';
import { useSession } from './session-context';

export function BoosterEngineGroups({ interactive = false }: { interactive?: boolean }) {
  const session = useSession();
  const root = useRef<HTMLDivElement>(null);
  const surface = interactive ? 'controls' : 'hud';
  useEffect(() => {
    session.bindEngineGroups(surface, group => root.current?.querySelector(`[data-engine-group="${group}"]`) ?? null);
    return () => session.bindEngineGroups(surface, () => null);
  }, [session, surface]);
  return (
    <div ref={root} className={interactive ? 'grid w-full gap-1' : 'grid min-w-0 grid-cols-3 gap-2'}>
      {ENGINE_GROUP_NAMES.map(group => {
        const content = <>
          <span className="text-[11px]">{ENGINE_GROUP_LABELS[group]} · {BOOSTER_ENGINE_GROUPS[group].length}</span>
          <span data-engine-group={group} className={`${interactive ? 'whitespace-nowrap' : 'whitespace-normal'} font-mono text-[10px] text-ui-muted`}>0 lit · 0 start · 0 fail</span>
        </>;
        return interactive
          ? <Button key={group} type="button" data-testid={`engine-group-${group}`} data-indicator={`group-${group}`} aria-pressed={false}
              className="flex w-full items-center justify-between gap-2 aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected" onClick={() => session.emit({ type: 'engineGroup', group })}>{content}</Button>
          : <div key={group} className="grid min-w-0 gap-1">{content}</div>;
      })}
    </div>
  );
}
