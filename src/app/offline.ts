/**
 * Service worker registration.
 *
 * The 2021 About screen claimed the game "can be played offline". It could not:
 * `index.html` pulled PixiJS and Plotly from two CDNs on every load, so with no
 * network there was no renderer and no charts. M4.5 removed the CDN charts;
 * this closes the rest.
 *
 * Registration is deliberately non-blocking and deliberately silent on failure.
 * A service worker is an enhancement — if the browser refuses one (private
 * browsing, an insecure origin, a user setting), the simulator still runs; it
 * just runs online only. Throwing here would trade a working game for a
 * stack trace.
 */
export interface OfflineSupport {
  /** True if a service worker could be registered at all. */
  readonly supported: boolean;
  register(): Promise<boolean>;
}

/**
 * @param scriptUrl relative on purpose. The build sets vite's `base` to './',
 *   so the app may be served from any path; an absolute '/sw.js' would look for
 *   the worker at the domain root and register nothing when it is not there.
 */
export function createOfflineSupport(
  navigatorRef: Navigator = navigator,
  scriptUrl = './sw.js',
): OfflineSupport {
  const supported = 'serviceWorker' in navigatorRef;

  return {
    supported,
    async register(): Promise<boolean> {
      if (!supported) return false;
      try {
        // No explicit scope: the default is the worker's own directory, which
        // is exactly the directory the app was served from.
        await navigatorRef.serviceWorker.register(scriptUrl);
        return true;
      } catch {
        return false;
      }
    },
  };
}
