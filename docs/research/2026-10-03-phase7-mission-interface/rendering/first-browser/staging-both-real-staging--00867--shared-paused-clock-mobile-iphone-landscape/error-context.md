# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staging.spec.ts >> both real staging bodies render and selection preserves the shared paused clock @mobile
- Location: tests/e2e/staging.spec.ts:13:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="select-super-heavy"]')
    - locator resolved to <button role="tab" type="button" aria-selected="false" data-testid="select-super-heavy" class="ui-target relative flex items-center justify-center text-[12px] font-medium transition-colors duration-100 px-3 py-1.5 rounded-ui-control border border-transparent text-ui-muted hover:border-ui-line hover:text-ui-fg">Super Heavy</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button aria-label="Menu" data-testid="open-menu" aria-keyshortcuts="Esc" data-variant="secondary" class="ui-target inline-flex items-center justify-center rounded-ui-control depress transition-colors duration-100 select-none px-3.5 text-[12px] gap-2 border border-ui-line bg-ui-bg hover:bg-ui-fg hover:text-ui-on-selected shrink-0 text-ui-fg aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected">…</button> from <header class="absolute inset-x-0 top-0 z-20 box-content grid items-center border-b border-flight-backing-line bg-flight-backing pt-[env(safe-area-inset-top,0px)] text-ui-fg h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-4 px-4">…</header> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button aria-label="Menu" data-testid="open-menu" aria-keyshortcuts="Esc" data-variant="secondary" class="ui-target inline-flex items-center justify-center rounded-ui-control depress transition-colors duration-100 select-none px-3.5 text-[12px] gap-2 border border-ui-line bg-ui-bg hover:bg-ui-fg hover:text-ui-on-selected shrink-0 text-ui-fg aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected">…</button> from <header class="absolute inset-x-0 top-0 z-20 box-content grid items-center border-b border-flight-backing-line bg-flight-backing pt-[env(safe-area-inset-top,0px)] text-ui-fg h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-4 px-4">…</header> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    93 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button aria-label="Menu" data-testid="open-menu" aria-keyshortcuts="Esc" data-variant="secondary" class="ui-target inline-flex items-center justify-center rounded-ui-control depress transition-colors duration-100 select-none px-3.5 text-[12px] gap-2 border border-ui-line bg-ui-bg hover:bg-ui-fg hover:text-ui-on-selected shrink-0 text-ui-fg aria-pressed:border-ui-line aria-pressed:bg-ui-selected aria-pressed:text-ui-on-selected">…</button> from <header class="absolute inset-x-0 top-0 z-20 box-content grid items-center border-b border-flight-backing-line bg-flight-backing pt-[env(safe-area-inset-top,0px)] text-ui-fg h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-4 px-4">…</header> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Starship
          - generic [ref=e8]: Hot staging
          - generic [ref=e9]: Manual
        - generic [ref=e10]:
          - generic [ref=e11]: T+
          - generic [ref=e12]: 00:00:01
        - generic [ref=e13]:
          - button "Pause" [ref=e14]:
            - text: Pause
            - generic [ref=e15]: P
          - button "Cinematic" [ref=e17]
          - button "Sound" [pressed] [ref=e24]
          - button "Black box" [ref=e30]
          - button "Menu" [ref=e34]:
            - text: Menu
            - generic [ref=e35]: Esc
      - region "Flight data" [ref=e37]:
        - generic [ref=e38]:
          - status [ref=e40]:
            - generic [ref=e41]: PRE-FLIGHT
            - generic [ref=e42]: → LIFTOFF
          - button "Details" [ref=e43]
        - status [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Altitude
              - generic [ref=e52]:
                - generic [ref=e53]: "72.0"
                - generic [ref=e54]: KM
            - generic [ref=e58]:
              - generic [ref=e59]: V/S
              - generic [ref=e62]:
                - generic [ref=e63]: "1120"
                - generic [ref=e64]: M/S
            - generic [ref=e65]:
              - generic [ref=e66]: Speed
              - generic [ref=e69]:
                - generic [ref=e70]: "1.6"
                - generic [ref=e71]: KM/S
          - generic [ref=e75]:
            - generic [ref=e77]:
              - generic [ref=e78]: Propellant
              - generic [ref=e79]:
                - generic [ref=e80]: CH4
                - generic [ref=e84]: LOX
              - generic [ref=e88]:
                - generic [ref=e89]: "1197"
                - generic [ref=e90]: T
            - generic [ref=e91]: Engines
            - generic [ref=e107]:
              - generic [ref=e108]: Attitude
              - generic [ref=e113]:
                - generic [ref=e114]: "45"
                - generic [ref=e115]: °
      - region "Trajectory map" [ref=e116]:
        - button "Trajectory" [ref=e117]
      - generic [ref=e120]:
        - region "Engines" [ref=e121]:
          - button "Engines controls" [ref=e123]:
            - generic [ref=e124]: Engines
        - region "Flight" [ref=e127]:
          - generic [ref=e128]:
            - button "Flight controls" [expanded] [ref=e129]:
              - generic [ref=e130]: Flight
            - button "Zoom out" [ref=e133]:
              - generic [ref=e134]: −
            - button "Zoom in" [ref=e135]:
              - generic [ref=e136]: +
          - generic [ref=e138]:
            - generic [ref=e139]:
              - tablist "Vehicle to fly" [ref=e140]:
                - tab "Ship" [selected] [ref=e141]
                - tab "Super Heavy" [ref=e142]
              - status [ref=e144]: Separated
            - generic [ref=e145]:
              - generic [ref=e146]:
                - generic [ref=e147]: Attitude
                - generic [ref=e148]: Centre
              - slider "Attitude" [ref=e149] [cursor=pointer]: "0"
            - group "Autopilot" [ref=e150]:
              - button "Manual" [pressed] [ref=e151]
              - button "Lift off" [ref=e152]
              - button "Boost back" [ref=e153]
              - button "Hold attitude" [ref=e154]
              - button "Land" [ref=e155]
              - button "Deorbit" [ref=e156]
            - group "Systems" [ref=e157]:
              - button "Fins" [ref=e158]
              - button "Reaction control" [ref=e159]
              - button "Dump propellant" [ref=e160]
  - button "select to enable accessibility for this content" [ref=e161]
```

# Test source

```ts
  1   | /**
  2   |  * Things every spec needs, once the layout stopped being one layout.
  3   |  *
  4   |  * M6.6 made the flight-control panels bottom SHEETS on a phone, and sheets
  5   |  * start closed — a rail can sit open beside the world indefinitely, a sheet
  6   |  * covers half a 390px screen. So "is the Auto-Land button visible" stopped
  7   |  * having one answer, and a spec that runs in both the desktop project and the
  8   |  * phone projects has to ask for the controls rather than assume them.
  9   |  *
  10  |  * That is not a workaround for the test. It is the capability-parity question
  11  |  * asked correctly: every 2021 control still exists and works, reachable in at
  12  |  * most one tap.
  13  |  */
  14  | import { expect, type Page } from '@playwright/test';
  15  | import { byTestId, readoutUnitTestId, readoutValueTestId } from '../../src/ui/testids';
  16  | import { PHONE_PORTRAIT, SHORT_LANDSCAPE } from '../../src/ui/shell/layout-queries';
  17  | 
  18  | /** Wait until the first frame has written a readout — the app is live. */
  19  | export async function ready(page: Page): Promise<void> {
  20  |   await expect
  21  |     .poll(
  22  |       async () => (await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) !== '',
  23  |       { timeout: 20_000 },
  24  |     )
  25  |     .toBe(true);
  26  | }
  27  | 
  28  | /**
  29  |  * Make the engine and yoke controls reachable.
  30  |  *
  31  |  * A no-op on a rail layout, where both panels are already open. On a phone it
  32  |  * opens each sheet in turn — and because only one may be open at a time there,
  33  |  * it checks the control it wants rather than assuming a sheet stayed open.
  34  |  */
  35  | export async function openControls(page: Page): Promise<void> {
  36  |   const throttle = page.locator(byTestId('throttle'));
  37  |   if (!(await throttle.isVisible())) {
  38  |     await page.locator(byTestId('engine-panel-toggle')).click();
  39  |     await expect(throttle).toBeVisible();
  40  |   }
  41  | }
  42  | 
  43  | /** The same, for the yoke and autopilot panel on the other side. */
  44  | export async function openYoke(page: Page): Promise<void> {
  45  |   const pitch = page.locator(byTestId('yoke-pitch'));
  46  |   if (!(await pitch.isVisible())) {
  47  |     await page.locator(byTestId('yoke-panel-toggle')).click();
  48  |     await expect(pitch).toBeVisible();
  49  |   }
  50  | }
  51  | 
  52  | /**
  53  |  * Which panel each control lives in.
  54  |  *
  55  |  * index.html:72 and :92 — the split is 2021's and has not moved. Written out
  56  |  * because on a phone it decides which sheet has to be open, and a spec that
  57  |  * guessed wrong would fail in a way that looks like a broken control.
  58  |  */
  59  | const ENGINE_PANEL = new Set([
  60  |   'raptor-0',
  61  |   'raptor-1',
  62  |   'raptor-2',
  63  |   'all-raptors',
  64  |   'auto-max-thrust',
  65  |   'throttle',
  66  | ]);
  67  | 
  68  | /**
  69  |  * Make one control visible, whichever panel it is in.
  70  |  *
  71  |  * On a rail layout this is a no-op — both panels are already open. On a phone
  72  |  * ONLY ONE SHEET MAY BE OPEN AT A TIME, which is a deliberate design rule (two
  73  |  * sheets stacked over a 390px screen leave nothing of the flight) and which
  74  |  * makes "assert every control is visible" an impossible question there rather
  75  |  * than a failing one. The right question, and the one capability parity
  76  |  * actually asks, is whether each control can be reached — so a spec reveals the
  77  |  * control it is about to use.
  78  |  */
  79  | export async function reveal(page: Page, id: string): Promise<void> {
  80  |   const control = page.locator(byTestId(id));
  81  |   if (await control.isVisible()) return;
  82  |   await page
  83  |     .locator(byTestId(ENGINE_PANEL.has(id) ? 'engine-panel-toggle' : 'yoke-panel-toggle'))
  84  |     .click();
  85  |   await expect(control, `${id} should be reachable in one tap`).toBeVisible();
  86  | }
  87  | 
  88  | /** Reveal a control and click it. */
  89  | export async function tap(page: Page, id: string): Promise<void> {
  90  |   await reveal(page, id);
> 91  |   await page.locator(byTestId(id)).click();
      |                                    ^ Error: locator.click: Test timeout of 60000ms exceeded.
  92  | }
  93  | 
  94  | /** True when the layout is the phone one — sheets rather than rails. */
  95  | export async function isPhoneLayout(page: Page): Promise<boolean> {
  96  |   return page.evaluate((q) => window.matchMedia(q).matches, PHONE_PORTRAIT);
  97  | }
  98  | 
  99  | /**
  100 |  * True when the layout is COMPACT — a phone in either orientation.
  101 |  *
  102 |  * A different question from `isPhoneLayout`. A landscape phone is over 600 px
  103 |  * wide, so it keeps rails like a desktop; what it lacks is height, so the
  104 |  * cluster is the compact one and the rails start folded (`short` in
  105 |  * src/ui/shell/layout.ts).
  106 |  */
  107 | export async function isCompactLayout(page: Page): Promise<boolean> {
  108 |   return page.evaluate(
  109 |     ([phone, short]) => window.matchMedia(phone).matches || window.matchMedia(short).matches,
  110 |     [PHONE_PORTRAIT, SHORT_LANDSCAPE] as const,
  111 |   );
  112 | }
  113 | 
  114 | /** A readout's value and unit, as the HUD shows them; NaN until its first frame. */
  115 | export async function readout(page: Page, id: string): Promise<{ value: number; unit: string }> {
  116 |   const text = (await page.locator(byTestId(readoutValueTestId(id))).textContent()) ?? '';
  117 |   const unit = ((await page.locator(byTestId(readoutUnitTestId(id))).textContent()) ?? '').trim().toLowerCase();
  118 |   // Empty until the HUD's first frame: unread, not zero.
  119 |   return { value: text.trim() === '' ? NaN : Number(text), unit };
  120 | }
  121 | 
  122 | /**
  123 |  * Altitude in metres. The readout switches unit at 1 km, so the unit has to be
  124 |  * read too — otherwise a climb past 1000 m looks like a fall to 1.0.
  125 |  */
  126 | export async function altitudeMetres(page: Page): Promise<number> {
  127 |   const { value, unit } = await readout(page, 'altitude');
  128 |   return unit === 'km' ? value * 1000 : value;
  129 | }
  130 | 
  131 | /**
  132 |  * A point where the world canvas itself is on top, for a click that has to
  133 |  * land on the world (a gesture) and not on the chrome over it. Scans a grid
  134 |  * rather than assuming a corner: which corners are free depends on the layout.
  135 |  */
  136 | export async function worldPoint(page: Page): Promise<{ x: number; y: number }> {
  137 |   const point = await page.evaluate(() => {
  138 |     const canvas = document.querySelector('[data-testid="world-canvas"]');
  139 |     const box = canvas?.getBoundingClientRect();
  140 |     if (!canvas || !box) return null;
  141 |     for (let fy = 0.5; fy <= 0.9; fy += 0.1) {
  142 |       for (let fx = 0.3; fx <= 0.7; fx += 0.1) {
  143 |         const x = Math.round(box.width * fx);
  144 |         const y = Math.round(box.height * fy);
  145 |         if (document.elementFromPoint(box.x + x, box.y + y) === canvas) return { x, y };
  146 |       }
  147 |     }
  148 |     return null;
  149 |   });
  150 |   expect(point, 'some of the world must be uncovered').not.toBeNull();
  151 |   return point!;
  152 | }
  153 | 
```