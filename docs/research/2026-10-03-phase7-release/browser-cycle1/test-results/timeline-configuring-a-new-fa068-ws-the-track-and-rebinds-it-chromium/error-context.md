# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline.spec.ts >> configuring a new scenario redraws the track and rebinds it
- Location: tests/e2e/timeline.spec.ts:66:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-metric="event-ENTRY"]')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-metric="event-ENTRY"]')
    11 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Starship
        - generic [ref=e8]: Booster Sep, edited
        - generic [ref=e9]: Manual
      - generic [ref=e10]:
        - generic [ref=e11]: T+
        - generic [ref=e12]: 00:00:04
      - generic [ref=e13]:
        - button "Pause" [ref=e14]:
          - text: Pause
          - generic [ref=e15]: P
        - button "Cinematic" [ref=e17]
        - button "Sound" [pressed] [ref=e25]
        - button "Black box" [ref=e32]
        - button "Menu" [active] [ref=e37]:
          - text: Menu
          - generic [ref=e38]: Esc
    - region "Flight data" [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]:
          - list [ref=e43]:
            - listitem [ref=e44]:
              - generic [ref=e45]: BOOSTBACK
            - listitem [ref=e49]:
              - generic [ref=e50]: APOGEE
            - listitem [ref=e54]:
              - generic [ref=e55]: ENTRY BURN
            - listitem [ref=e59]:
              - generic [ref=e60]: LANDING BURN
            - listitem [ref=e64]:
              - generic [ref=e65]: CAUGHT
          - status [ref=e68]: PRE-FLIGHT→ BOOSTBACK
        - button "Details" [expanded] [ref=e69]
      - status [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]: Altitude
              - generic [ref=e77]:
                - generic [ref=e78]: Dial range
                - text: 0–100KM
            - generic [ref=e83]:
              - generic [ref=e84]: "74.5"
              - generic [ref=e85]: KM
          - generic [ref=e86]:
            - generic [ref=e87]: Vertical speed
            - generic [ref=e90]:
              - generic [ref=e91]: "1093"
              - generic [ref=e92]: M/S
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e95]: Speed
              - generic [ref=e96]:
                - generic [ref=e97]: Dial range
                - text: 0–2KM/S
            - generic [ref=e102]:
              - generic [ref=e103]: "1.6"
              - generic [ref=e104]: KM/S
        - generic [ref=e105]:
          - generic [ref=e107]:
            - generic [ref=e108]: Propellant
            - generic [ref=e109]:
              - generic [ref=e110]: CH4
              - generic [ref=e115]: LOX
            - generic [ref=e120]:
              - generic [ref=e121]: "500"
              - generic [ref=e122]: T
          - generic [ref=e123]:
            - generic [ref=e124]: Attitude
            - generic [ref=e129]:
              - generic [ref=e130]: "45"
              - generic [ref=e131]: °
        - generic [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]: Centre · 3
            - generic [ref=e135]: 0 lit · 0 start · 0 fail
          - generic [ref=e136]:
            - generic [ref=e137]: Inner · 10
            - generic [ref=e138]: 0 lit · 0 start · 0 fail
          - generic [ref=e139]:
            - generic [ref=e140]: Outer · 20
            - generic [ref=e141]: 0 lit · 0 start · 0 fail
        - generic [ref=e142]:
          - generic [ref=e143]:
            - generic "Horizontal speed" [ref=e144]: H/S
            - generic [ref=e145]:
              - generic [ref=e146]: "1130"
              - generic [ref=e147]: M/S
          - generic [ref=e148]:
            - generic "Speed as a multiple of the speed of sound" [ref=e149]: Mach
            - generic [ref=e150]: "5.41"
          - generic [ref=e152]:
            - generic "Dynamic pressure" [ref=e153]: Q
            - generic [ref=e154]:
              - generic [ref=e155]: "0.1"
              - generic [ref=e156]: KPA
          - generic [ref=e157]:
            - generic "Acceleration felt on board, in g" [ref=e158]: G
            - generic [ref=e159]: "0.0"
          - generic [ref=e161]:
            - generic "Thrust to weight ratio" [ref=e162]: TWR
            - generic [ref=e163]: "0.0"
          - generic [ref=e165]:
            - generic "Throttle" [ref=e166]
            - generic [ref=e167]:
              - generic [ref=e168]: "100"
              - generic [ref=e169]: "%"
          - generic [ref=e170]:
            - generic "Skin temperature" [ref=e171]: Heat
            - generic [ref=e172]:
              - generic [ref=e173]: "461"
              - generic [ref=e174]: K
          - generic [ref=e175]:
            - generic "Distance to the landing site" [ref=e176]: Range
            - generic [ref=e177]:
              - generic [ref=e178]: "49.5"
              - generic [ref=e179]: KM
    - region "Trajectory map" [ref=e180]:
      - button "Trajectory" [expanded] [ref=e181]
    - generic [ref=e186]:
      - region "Engines" [ref=e187]:
        - button "Engines controls" [expanded] [ref=e189]:
          - generic [ref=e190]: Engines
        - generic [ref=e194]:
          - generic [ref=e195]:
            - button "Engines" [ref=e196]:
              - generic [ref=e198]: Space
            - generic [ref=e200]:
              - button "Centre · 3 0 lit · 0 start · 0 fail" [ref=e201]:
                - generic [ref=e202]: Centre · 3
                - generic [ref=e203]: 0 lit · 0 start · 0 fail
              - button "Inner · 10 0 lit · 0 start · 0 fail" [ref=e204]:
                - generic [ref=e205]: Inner · 10
                - generic [ref=e206]: 0 lit · 0 start · 0 fail
              - button "Outer · 20 0 lit · 0 start · 0 fail" [ref=e207]:
                - generic [ref=e208]: Outer · 20
                - generic [ref=e209]: 0 lit · 0 start · 0 fail
          - generic [ref=e210]:
            - generic [ref=e211]:
              - generic [ref=e212]: Throttle
              - generic [ref=e213]: "Off"
            - slider "Throttle" [ref=e214] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=e215]:
            - generic [ref=e217]: "Off"
          - generic [ref=e218]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e219]:
        - generic [ref=e220]:
          - button "Flight controls" [expanded] [ref=e221]:
            - generic [ref=e222]: Flight
          - button "Zoom out" [ref=e225]:
            - generic [ref=e226]: −
          - button "Zoom in" [ref=e227]:
            - generic [ref=e228]: +
        - generic [ref=e230]:
          - generic [ref=e231]: Super Heavy
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]: Attitude
              - generic [ref=e235]: Centre
            - slider "Attitude" [ref=e236] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e237]:
            - button "Manual" [pressed] [ref=e238]
            - button "Lift off" [ref=e239]
            - button "Boost back" [ref=e240]
            - button "Hold attitude" [ref=e241]
            - button "Catch" [ref=e242]
            - button "Deorbit" [disabled] [ref=e243]
          - group "Systems" [ref=e244]:
            - button "Fins" [ref=e245]
            - button "Reaction control" [ref=e246]
            - button "Dump propellant" [ref=e247]
```

# Test source

```ts
  1   | /**
  2   |  * M6.3: the event track, in a real browser.
  3   |  *
  4   |  * The unit tests prove the derivation over the seven goldens and the binder
  5   |  * against stubs. What only a browser shows is the wiring: that the track
  6   |  * rendered, that the binder found its dots, that `observe` is being called from
  7   |  * the frame loop at all — and, the case with the most moving parts, that
  8   |  * changing scenario re-renders the dots AND re-points the binder at them.
  9   |  */
  10  | import { expect, test } from '@playwright/test';
  11  | import { byTestId, readoutValueTestId } from '../../src/ui/testids';
  12  | 
  13  | async function ready(page: import('@playwright/test').Page) {
  14  |   await expect
  15  |     .poll(
  16  |       async () => (await page.locator(byTestId(readoutValueTestId('altitude'))).textContent()) !== '',
  17  |       { timeout: 15_000 },
  18  |     )
  19  |     .toBe(true);
  20  | }
  21  | 
  22  | const dot = (page: import('@playwright/test').Page, event: string) =>
  23  |   page.locator(`[data-metric="event-${event}"]`);
  24  | 
  25  | test('the intro track is drawn and reaches touchdown', async ({ page }) => {
  26  |   await page.goto('/', { waitUntil: 'load' });
  27  |   await ready(page);
  28  | 
  29  |   // The intro's expected track is short: it starts already in the final
  30  |   // descent. Both dots must exist before anything happens to them.
  31  |   await expect(dot(page, 'LANDING BURN')).toHaveCount(1);
  32  |   await expect(dot(page, 'TOUCHDOWN')).toHaveCount(1);
  33  | 
  34  |   // The demo lands itself in about ten seconds. TOUCHDOWN is the last thing
  35  |   // that happens, so it ends `current`.
  36  |   await expect
  37  |     .poll(async () => dot(page, 'TOUCHDOWN').getAttribute('data-state'), {
  38  |       timeout: 40_000,
  39  |       intervals: [250],
  40  |     })
  41  |     .toBe('current');
  42  | 
  43  |   // And the one before it is reached, not still pending — which is what proves
  44  |   // the binder is writing states rather than one state.
  45  |   await expect(dot(page, 'LANDING BURN')).toHaveAttribute('data-state', 'reached');
  46  | });
  47  | 
  48  | test('the narration says where the flight is and what is next', async ({ page }) => {
  49  |   await page.goto('/', { waitUntil: 'load' });
  50  |   await ready(page);
  51  | 
  52  |   const now = page.locator(byTestId('event-now'));
  53  |   const next = page.locator(byTestId('event-next'));
  54  | 
  55  |   // Something is always said, from the very first frame.
  56  |   await expect(now).not.toBeEmpty();
  57  | 
  58  |   await expect
  59  |     .poll(async () => now.textContent(), { timeout: 40_000, intervals: [250] })
  60  |     .toBe('TOUCHDOWN');
  61  | 
  62  |   // Nothing outstanding on the intro's track once it has landed.
  63  |   await expect(next).toHaveText('');
  64  | });
  65  | 
  66  | test('configuring a new scenario redraws the track and rebinds it', async ({ page }) => {
  67  |   await page.goto('/', { waitUntil: 'load' });
  68  |   await ready(page);
  69  | 
  70  |   // The intro's track is two dots — it starts already in the final descent.
  71  |   // Booster Sep's is six, and includes an ENTRY the intro has no idea about.
  72  |   await expect(dot(page, 'ENTRY')).toHaveCount(0);
  73  | 
  74  |   await page.locator(byTestId('open-menu')).click();
  75  |   await page.locator(byTestId('preset-booster-sep')).click();
  76  |   await page.locator(byTestId('menu-configure')).click();
  77  | 
> 78  |   await expect(dot(page, 'ENTRY')).toHaveCount(1);
      |                                    ^ Error: expect(locator).toHaveCount(expected) failed
  79  |   await expect(dot(page, 'MECO')).toHaveCount(1);
  80  | 
  81  |   // A fresh flight is a fresh story: the new dots start pending rather than
  82  |   // carrying the previous flight's states over.
  83  |   await expect(dot(page, 'ENTRY')).toHaveAttribute('data-state', 'pending');
  84  |   await expect(page.locator(byTestId('event-now'))).toHaveText('PRE-FLIGHT');
  85  | 
  86  |   // Now the half that actually needs the rebind to have worked. Configure a
  87  |   // landing, fly it with the autopilot, and watch the dots light. If the binder
  88  |   // were still pointed at the elements the re-render replaced, these would sit
  89  |   // pending forever while it wrote into orphans — which is precisely the bug
  90  |   // that looks like "the timeline stopped working after I changed scenario".
  91  |   await page.locator(byTestId('open-menu')).click();
  92  |   await page.locator(byTestId('preset-landing-burn')).click();
  93  |   await page.locator(byTestId('menu-configure')).click();
  94  | 
  95  |   await expect(dot(page, 'TOUCHDOWN')).toHaveAttribute('data-state', 'pending');
  96  |   await page.locator(byTestId('auto-land')).click();
  97  | 
  98  |   await expect
  99  |     .poll(async () => dot(page, 'TOUCHDOWN').getAttribute('data-state'), {
  100 |       timeout: 40_000,
  101 |       intervals: [250],
  102 |     })
  103 |     .toBe('current');
  104 | });
  105 | 
  106 | test('a scenario that never reaches an event leaves it dark', async ({ page }) => {
  107 |   await page.goto('/', { waitUntil: 'load' });
  108 |   await ready(page);
  109 | 
  110 |   await page.locator(byTestId('open-menu')).click();
  111 |   await page.locator(byTestId('preset-before-flip')).click();
  112 |   await page.locator(byTestId('menu-configure')).click();
  113 | 
  114 |   // A kilometre up, engines off, autopilot off. It is falling, and it has not
  115 |   // flipped, has not lit a landing burn, and has certainly not landed. Events
  116 |   // are observed, never scripted: a flight that does not happen lights nothing.
  117 |   await page.waitForTimeout(3_000);
  118 |   for (const event of ['FLIP', 'LANDING BURN', 'TOUCHDOWN']) {
  119 |     await expect(dot(page, event), event).toHaveAttribute('data-state', 'pending');
  120 |   }
  121 |   await expect(page.locator(byTestId('event-now'))).toHaveText('PRE-FLIGHT');
  122 | });
  123 | 
```