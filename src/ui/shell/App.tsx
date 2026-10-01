/**
 * The flight screen: the world canvas and the surfaces over it.
 *
 * One session per page. App mounts it on the canvas and lays out the zones
 * from docs/design/ia.md; each surface owns its zone and talks to the session
 * through useSession(). Nothing here runs per frame.
 */
import { useEffect, useMemo, useRef } from 'react';
import { createSession } from '$ui/session/session';
import { SessionContext } from './session-context';
import { StatusBar } from './StatusBar/StatusBar';
import { Hud } from './Hud/Hud';
import { TrajectoryCard } from './TrajectoryCard/TrajectoryCard';
import { Controls } from './Controls/Controls';
import { Menu } from './Menu/Menu';
import { BlackBox } from './BlackBox/BlackBox';
import { Debrief } from './Debrief/Debrief';
import { FirstFlight } from './FirstFlight/FirstFlight';

export function App() {
  const session = useMemo(() => createSession(), []);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    void session.mount(el).then((fn) => {
      if (cancelled) fn();
      else teardown = fn;
    });
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [session]);

  return (
    <SessionContext.Provider value={session}>
      {/* The world. Named: the trajectory map is a second canvas. */}
      <canvas ref={canvas} data-testid="world-canvas" className="fixed inset-0 block h-full w-full" />
      <div className="pointer-events-none fixed inset-0 select-none [&>*]:pointer-events-auto">
        <StatusBar />
        <Hud />
        <TrajectoryCard />
        <Controls />
        <FirstFlight />
        <Debrief />
      </div>
      <Menu />
      <BlackBox />
    </SessionContext.Provider>
  );
}
