# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parity.spec.ts >> the restart button appears when the flight ends and starts it again
- Location: tests/e2e/parity.spec.ts:94:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-testid="debrief"]')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-testid="debrief"]')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Starship
        - generic [ref=e8]: Landing Burn, edited
        - generic [ref=e9]: Manual
      - generic [ref=e10]:
        - generic [ref=e11]: T+
        - generic [ref=e12]: 00:00:03
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
    - region "Trajectory map" [ref=e40]:
      - button "Trajectory" [expanded] [ref=e41]
    - generic [ref=e46]:
      - region "Engines" [ref=e47]:
        - button "Engines controls" [expanded] [ref=e49]:
          - generic [ref=e50]: Engines
        - generic [ref=e54]:
          - generic [ref=e55]:
            - button "Engines" [ref=e56]:
              - generic [ref=e58]: Space
            - group "Sea-level engines" [ref=e60]:
              - generic [ref=e61]: SL
              - button "Sea-level engine 1" [ref=e62]
              - button "Sea-level engine 2" [ref=e64]
              - button "Sea-level engine 3" [ref=e66]
            - group "Vacuum engines" [ref=e68]:
              - generic [ref=e69]: Vac
              - button "Vacuum engine 1" [ref=e70]
              - button "Vacuum engine 2" [ref=e72]
              - button "Vacuum engine 3" [ref=e74]
          - generic [ref=e76]:
            - generic [ref=e77]:
              - generic [ref=e78]: Throttle
              - generic [ref=e79]: "Off"
            - slider "Throttle" [ref=e80] [cursor=pointer]: "100"
          - button "Throttle guard" [ref=e81]:
            - generic [ref=e83]: "Off"
          - generic [ref=e84]: Throttles back to keep the speed under the safe dynamic-pressure limit.
      - region "Flight" [ref=e85]:
        - generic [ref=e86]:
          - button "Flight controls" [expanded] [ref=e87]:
            - generic [ref=e88]: Flight
          - button "Zoom out" [ref=e91]:
            - generic [ref=e92]: −
          - button "Zoom in" [ref=e93]:
            - generic [ref=e94]: +
        - generic [ref=e96]:
          - generic [ref=e97]: Ship
          - generic [ref=e98]:
            - generic [ref=e99]:
              - generic [ref=e100]: Attitude
              - generic [ref=e101]: Centre
            - slider "Attitude" [ref=e102] [cursor=pointer]: "0"
          - group "Autopilot" [ref=e103]:
            - button "Manual" [pressed] [ref=e104]
            - button "Lift off" [ref=e105]
            - button "Boost back" [ref=e106]
            - button "Hold attitude" [ref=e107]
            - button "Land" [ref=e108]
            - button "Deorbit" [ref=e109]
          - group "Systems" [ref=e110]:
            - button "Fins" [ref=e111]
            - button "Reaction control" [ref=e112]
            - button "Dump propellant" [ref=e113]
    - region "Flight debrief":
      - generic:
        - generic:
          - generic: Custom
          - heading "Crashed" [level=2]
          - paragraph: Descending too fast
        - button "Close debrief" [ref=e114]:
          - generic [ref=e115]: ×
      - generic [ref=e116]:
        - generic [ref=e117]:
          - generic [ref=e118]: Touchdown
          - generic [ref=e119]: 67.2m/s
          - generic [ref=e120]:
            - generic [ref=e121]: Over
            - text: limit 10
        - generic [ref=e123]:
          - generic [ref=e124]: Drift
          - generic [ref=e125]: 0.00m/s
          - generic [ref=e126]: Limit 2
        - generic [ref=e127]:
          - generic [ref=e128]: Tilt
          - generic [ref=e129]: 0.0°
          - generic [ref=e130]: Limit 5.2°
        - generic [ref=e131]:
          - generic [ref=e132]: From the pad
          - generic [ref=e133]: 0m
          - generic [ref=e134]: On the pad
        - generic [ref=e135]:
          - generic [ref=e136]: Flight time
          - generic [ref=e137]: 00:00:03
        - generic [ref=e139]:
          - generic [ref=e140]: Propellant
          - generic [ref=e141]: 20t
          - generic [ref=e142]: left of 1200 t
        - generic [ref=e143]:
          - generic [ref=e144]: Peak Q
          - generic [ref=e145]: 2.8kPa
          - generic [ref=e146]: Limit 50
        - generic [ref=e147]:
          - generic [ref=e148]: Peak skin temperature
          - generic [ref=e149]: 294K
          - generic [ref=e150]: Limit 1533
        - generic [ref=e151]:
          - generic [ref=e152]: Peak g
          - generic [ref=e153]: 0.1g
          - generic [ref=e154]: Limit 13
      - list "Events":
        - listitem: 00:00:03Vehicle lost
      - generic:
        - button "Black box" [ref=e155]
        - button "Change scenario" [ref=e156]
        - button "Fly again" [ref=e157]
```

# Test source

```ts
  15  |     .toBe(true);
  16  | }
  17  | 
  18  | test('every 2021 flight control is present @smoke', async ({ page }) => {
  19  |   await page.goto('/', { waitUntil: 'load' });
  20  |   await ready(page);
  21  | 
  22  |   // switches.js — the flight controls.
  23  |   for (const id of [
  24  |     'raptor-0',
  25  |     'raptor-1',
  26  |     'raptor-2',
  27  |     'all-raptors',
  28  |     'auto-max-thrust',
  29  |     'auto-take-off',
  30  |     'boost-back',
  31  |     'pitch-hold',
  32  |     'auto-land',
  33  |     'fins',
  34  |     'rcs',
  35  |     'dump-fuel',
  36  |   ]) {
  37  |     await expect(page.locator(`[data-testid="${id}"]`), id).toBeAttached();
  38  |   }
  39  | 
  40  |   // The two sliders and the zoom pair.
  41  |   await expect(page.locator('[data-testid="throttle"]')).toBeAttached();
  42  |   await expect(page.locator('[data-testid="yoke-pitch"]')).toBeAttached();
  43  |   await expect(page.locator('[data-testid="zoom-in"]')).toBeAttached();
  44  |   await expect(page.locator('[data-testid="zoom-out"]')).toBeAttached();
  45  | });
  46  | 
  47  | test('the panels and the HUD collapse, as they did in 2021', async ({ page }) => {
  48  |   await page.goto('/', { waitUntil: 'load' });
  49  |   await ready(page);
  50  | 
  51  |   // dispUpdate.js:156 — show_controlsL / show_controlsR.
  52  |   const throttle = page.locator('[data-testid="throttle"]');
  53  |   await expect(throttle).toBeVisible();
  54  |   await page.locator('[data-testid="engine-panel-toggle"]').click();
  55  |   await expect(throttle).toBeHidden();
  56  |   await page.locator('[data-testid="engine-panel-toggle"]').click();
  57  |   await expect(throttle).toBeVisible();
  58  | 
  59  |   const pitch = page.locator('[data-testid="yoke-pitch"]');
  60  |   await page.locator('[data-testid="yoke-panel-toggle"]').click();
  61  |   await expect(pitch).toBeHidden();
  62  |   await page.locator('[data-testid="yoke-panel-toggle"]').click();
  63  |   await expect(pitch).toBeVisible();
  64  | 
  65  |   // dispUpdate.js:193 — show_hideFlightParamDispMid. Altitude and speed stay.
  66  |   const twr = page.locator('[data-testid="readout-twr"]');
  67  |   await expect(twr).toBeVisible();
  68  |   await page.locator('[data-testid="hud-toggle"]').click();
  69  |   await expect(twr).toBeHidden();
  70  |   await expect(page.locator('[data-testid="readout-altitude"]')).toBeVisible();
  71  |   await expect(page.locator('[data-testid="readout-speed"]')).toBeVisible();
  72  | });
  73  | 
  74  | test('collapsing a panel does not stop the binder writing to it', async ({ page }) => {
  75  |   // The panels are hidden, not unmounted, because the indicator binder resolved
  76  |   // their nodes once and holds the references. This proves the state kept up.
  77  |   await page.goto('/', { waitUntil: 'load' });
  78  |   await ready(page);
  79  | 
  80  |   const raptor = page.locator('[data-testid="raptor-0"]');
  81  |   // The intro flies with all three lit, so the press is a shutdown as often as
  82  |   // an ignition. What matters is that the hidden node tracked the change.
  83  |   const before = ((await raptor.getAttribute('class')) ?? '').includes('is-on');
  84  | 
  85  |   await page.locator('[data-testid="engine-panel-toggle"]').click();
  86  |   await page.keyboard.press('1');
  87  |   await page.waitForTimeout(300);
  88  |   await page.locator('[data-testid="engine-panel-toggle"]').click();
  89  | 
  90  |   const after = ((await raptor.getAttribute('class')) ?? '').includes('is-on');
  91  |   expect(after).toBe(!before);
  92  | });
  93  | 
  94  | test('the restart button appears when the flight ends and starts it again', async ({ page }) => {
  95  |   await page.goto('/', { waitUntil: 'load' });
  96  |   await ready(page);
  97  | 
  98  |   // Fly a landing-burn preset into the ground: cut the engines and wait.
  99  |   await page.locator('[data-testid="open-menu"]').click();
  100 |   await page.locator('[data-testid="preset-landing-burn"]').click();
  101 |   await page.locator('[data-testid="menu-configure"]').click();
  102 | 
  103 |   /*
  104 |     THE DEBRIEF COMES FIRST NOW (M12.1). A flight that ends on the ground raises
  105 |     the debrief card, which carries "Fly again" and hides this button while it
  106 |     is up — they are the same action, centred on the same point, and stacking
  107 |     them was the bug M12.1's first browser run found. The capability being
  108 |     checked here is unchanged: the flight ends, and there is a way to start it
  109 |     again. Both are exercised — the card's, and this one behind it.
  110 |   */
  111 |   const card = page.locator('[data-testid="debrief"]');
  112 |   await expect(card).toHaveCount(1, { timeout: 30_000 });
  113 |   await expect(page.locator('[data-testid="debrief-restart"]')).toBeVisible();
  114 |   await page.keyboard.press('Escape');
> 115 |   await expect(card).toHaveCount(0);
      |                      ^ Error: expect(locator).toHaveCount(expected) failed
  116 | 
  117 |   const restart = page.locator('[data-testid="restart"]');
  118 |   await expect(restart).toBeVisible({ timeout: 30_000 });
  119 | 
  120 |   await restart.click();
  121 |   await expect(restart).toHaveCount(0);
  122 | 
  123 |   // Back at the preset's 200 m and 20 t.
  124 |   await expect
  125 |     .poll(async () => Number(await page.locator('[data-testid="readout-propellant-value"]').textContent()), {
  126 |       timeout: 5_000,
  127 |     })
  128 |     .toBe(20);
  129 | });
  130 | 
  131 | test('the guide and the about screen open from the menu', async ({ page }) => {
  132 |   await page.goto('/', { waitUntil: 'load' });
  133 |   await ready(page);
  134 | 
  135 |   await page.locator('[data-testid="open-menu"]').click();
  136 |   await page.locator('[data-testid="menu-guide"]').click();
  137 | 
  138 |   const guide = page.locator('[data-testid="info-view"]');
  139 |   await expect(guide).toBeVisible();
  140 |   // The keybinds are generated from the binding table, so they cannot drift.
  141 |   await expect(guide).toContainText('Backspace');
  142 |   await expect(guide).toContainText('ArrowLeft');
  143 |   await expect(guide).toContainText('toggle all Raptors');
  144 | 
  145 |   await page.locator('[data-testid="info-close"]').click();
  146 |   await expect(guide).toHaveCount(0);
  147 | 
  148 |   await page.locator('[data-testid="menu-about"]').click();
  149 |   await expect(page.locator('[data-testid="info-view"]')).toBeVisible();
  150 | });
  151 | 
  152 | test('the tilt-control switch is present and on by default', async ({ page }) => {
  153 |   await page.goto('/', { waitUntil: 'load' });
  154 |   await ready(page);
  155 | 
  156 |   await page.locator('[data-testid="open-menu"]').click();
  157 |   const tilt = page.locator('[data-testid="menu-tilt-control"]');
  158 | 
  159 |   // eventListener.js:117 — `let tiltControlOn = true`.
  160 |   await expect(tilt).toHaveClass(/is-on/);
  161 |   await tilt.click();
  162 |   await expect(tilt).not.toHaveClass(/is-on/);
  163 | });
  164 | 
```