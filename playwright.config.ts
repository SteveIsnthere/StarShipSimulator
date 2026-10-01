import { defineConfig, devices } from '@playwright/test';
import { preinstalledChromium } from './tests/e2e/chromium';

/**
 * Smoke tests run against the production build, not the dev server: dev-only
 * transforms and HMR hide errors that ship. `npm run build` therefore runs
 * first, and the budget gate with it.
 *
 * E2E_PORT lets two worktrees run the browser suite at once without one
 * testing the other's server.
 */
const PORT = Number(process.env.E2E_PORT ?? 4174);

const executablePath = preinstalledChromium();

/**
 * What the phone projects run.
 *
 * Tagged rather than listed by filename, so adding a spec to the mobile matrix
 * is a deliberate act in the spec itself and not a quiet edit to this file.
 */
const MOBILE_SPECS = /@mobile/;

export default defineConfig({
  testDir: './tests/e2e',
  /*
    A TEST BUDGET THAT CAN HOLD THE WAITS THE TESTS THEMSELVES DECLARE.

    Playwright's default is 30 s, and five specs wait 40 s for a flight to reach
    a moment — the intro to hand over, a scenario to touch down, the offline
    flight to finish. A 40 s wait inside a 30 s budget can never spend its last
    ten seconds: the test is killed first, and the failure reads as an assertion
    about altitude or an event state rather than as what it is. It had been
    latent since M6 because the waits are only NEEDED when the machine is slow,
    and it surfaced at the M9 look pass as six failures across four specs — none
    of which the look pass caused: the same commit measured 2.4 fps against the
    previous commit's 2.5, and the same tests fail on both trees at the same
    rate. Under swiftshader, which is what runs here, a 30 s budget is simply
    less than the flights take.

    Sixty seconds, so the longest declared wait plus its setup fits with room.
    Raising it does not make a hung test pass — it still fails, twenty seconds
    later, and the trace still says where.
  */
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial in CI so the single runner is not oversubscribed. Omitted rather than
  // set to undefined off CI, because exactOptionalPropertyTypes rejects that.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? ([['github'], ['list']] as const) : ([['list']] as const),

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Headless containers have no GPU; PixiJS needs a working WebGL context
      // from M3.1 on. SwiftShader provides one.
      //
      // `--no-sandbox` because this runs as root in a container, and Chromium
      // refuses to start there without it: "Running as root without
      // --no-sandbox is not supported". It did not bite until M6.6 added four
      // more projects — one or two browsers at a time apparently got away with
      // it, and five did not, which made 56 of 57 failures in that run a single
      // environment message wearing 56 different test names.
      args: [
        '--no-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },

  /*
    Desktop plus four phone viewports (M6.6).

    A responsive layout that is only ever run at 1280x720 is a responsive
    layout nobody has checked. These are the two device classes the plan names
    — a Pixel-7-class Android and an iPhone-14-class — in both orientations,
    because they are genuinely different layouts rather than the same one
    scaled: portrait puts the panels on the bottom as sheets, landscape has
    width to spare and almost no height and stays a compressed desktop.

    The phone projects run the specs that are about the LAYOUT and the
    capabilities — smoke, controls, the test-id contract, responsiveness and
    offline. The rest (parity sweeps, chart internals, the golden-backed
    timeline behaviour) are viewport-independent and would only cost time.
    `grep` rather than a file list so a new spec has to be opted in
    deliberately; `grepInvert` on the desktop project keeps the mobile-only
    spec from running there and asserting a sheet layout that is not present.
  */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile-only/,
    },
    {
      name: 'pixel-portrait',
      use: { ...devices['Pixel 7'] },
      grep: MOBILE_SPECS,
    },
    {
      name: 'pixel-landscape',
      use: { ...devices['Pixel 7 landscape'] },
      grep: MOBILE_SPECS,
      grepInvert: /@portrait-only/,
    },
    /*
      The iPhone descriptors carry `defaultBrowserType: 'webkit'`, and WebKit is
      not installed here — the whole point of `preinstalledChromium()` above is
      that this environment ships one browser and forbids downloading others.
      Left alone, both iPhone projects failed every test at launch, and the
      browser log blamed a missing dbus socket and the root sandbox, which is
      what those messages always say and had nothing to do with it.

      `browserName: 'chromium'` says what these projects are actually for: an
      iPhone-class VIEWPORT and touch profile, not Safari's engine. That is an
      honest limit rather than a hidden one — nothing here is evidence about
      WebKit, and this comment is where a future session finds that out.
    */
    {
      name: 'iphone-portrait',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
      grep: MOBILE_SPECS,
    },
    {
      name: 'iphone-landscape',
      use: { ...devices['iPhone 14 landscape'], browserName: 'chromium' },
      grep: MOBILE_SPECS,
      grepInvert: /@portrait-only/,
    },
  ],

  webServer: {
    /*
      `--host 127.0.0.1`, and the reason is the first thing CI ever told us.

      M11.9 fixed the ordering that had been killing every CI run since the
      project's second commit, and the job got as far as a browser for the first
      time — where it died with `Timed out waiting 180000ms from
      config.webServer`, three minutes of nothing. The build inside this command
      takes nine seconds on the same runner, so the build was not what hung: the
      server came up and the poll below never reached it. `vite preview` binds
      the host it is given and defaults to `localhost`, which on a dual-stack
      runner resolves to ::1 first; the URL Playwright polls is written 127.0.0.1
      literally. Naming the same address on both sides removes the question.

      The timeout stays at three minutes, which is generous for a nine-second
      build: it was never the constraint.
    */
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
