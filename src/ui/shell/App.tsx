/**
 * The flight screen: the world canvas and the surfaces over it.
 *
 * One session per page. App mounts it on the canvas and lays out the zones
 * from docs/design/ia.md; each surface owns its zone and talks to the session
 * through useSession(). Nothing here runs per frame.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createSession } from '$ui/session/session';
import { SessionContext } from './session-context';
import { StatusBar } from './StatusBar/StatusBar';
import { Hud } from './Hud/Hud';
import { TrajectoryCard } from './TrajectoryCard/TrajectoryCard';
import { Controls } from './Controls/Controls';
import { FirstFlight } from './FirstFlight/FirstFlight';
import { FlightWorld } from './FlightWorld';
import { useSessionState } from './session-context';

/*
 * The menu and the black box are closed when the page loads and bring Radix's
 * dialog with them, so they are their own chunks: off the first-load budget,
 * fetched when the browser is idle, rendered once their layer first opens.
 */
const loadMenu = () => import('./Menu/Menu');
const loadBlackBox = () => import('./BlackBox/BlackBox');
const Menu = lazy(() => loadMenu().then((m) => ({ default: m.Menu })));
const BlackBox = lazy(() => loadBlackBox().then((m) => ({ default: m.BlackBox })));
// The debrief (and the restart behind it) only appears once a flight ends.
const loadDebrief = () => import('./Debrief/Debrief');
const Debrief = lazy(() => loadDebrief().then((m) => ({ default: m.Debrief })));

/** Mount a lazy layer from its first opening on, so its closing can animate. */
function Layers() {
  const layer = useSessionState((s) => s.layer);
  const [menuMounted, setMenuMounted] = useState(false);
  const [blackBoxMounted, setBlackBoxMounted] = useState(false);
  // Set during render: React's pattern for state derived from a change.
  if (!menuMounted && (layer === 'menu' || layer === 'guide' || layer === 'about')) setMenuMounted(true);
  if (!blackBoxMounted && layer === 'blackBox') setBlackBoxMounted(true);
  return (
    <Suspense fallback={null}>
      {menuMounted && <Menu />}
      {blackBoxMounted && <BlackBox />}
    </Suspense>
  );
}

export function App() {
  const session = useMemo(() => createSession(), []);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Warm the lazy layers once the page is idle, so the first opening is instant.
  useEffect(() => {
    const warm = () => void Promise.all([loadMenu(), loadBlackBox(), loadDebrief()]);
    const idle = window.requestIdleCallback?.(warm, { timeout: 4000 });
    const timer = idle === undefined ? window.setTimeout(warm, 2000) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

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
      {/*
        The world. Named: the trajectory map is a second canvas. Its box is the
        wrapper's, which ends above the phone's controls (the tab bar, and a
        sheet while one is open) so the ground and the vehicle on it are never
        under them: the camera reframes into the smaller box instead.
      */}
      <FlightWorld canvas={canvas} />
      <div className="pointer-events-none fixed inset-0 select-none [&>*]:pointer-events-auto">
        <StatusBar />
        <Hud />
        <TrajectoryCard />
        <Controls />
        <FirstFlight />
        <Suspense fallback={null}>
          <Debrief />
        </Suspense>
      </div>
      <Layers />
    </SessionContext.Provider>
  );
}
