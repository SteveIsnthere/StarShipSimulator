# Reconstructed 18-row scenario/vehicle matrix

New successor from `0d87c758`, not exact missing V22 bytes. The existing private
state builder is unchanged. `createScenarioState` now exposes its selected model
with literal SHIP default. Tier: **Refactor**. Numerical proof compares
every state leaf with Object.is through the unchanged selector route, both
models/all presets and 500 fixed-seed custom cases. Constructor proof plus
existing scenario tests pass 53/53; no default numerical behavior changed.

The matrix replaces five default-model rows with eighteen ID/model rows,
retaining nine generic smoke flights, the heat witness and two protected intro
tests: thirty total. Only four orbital rows use the independently reviewed
horizon. One loop charges all support/ascent/circularization/coast/return ticks.
The launch upward 1000m handoff is an explicitly reviewed successor policy from
the existing autoTakeOff test, not recovered history. Circularization uses
actual ignition/throttle slew; Ship RTLS uses boostback and its existing handoff.
No state/actuator teleport or preset/target/budget change is introduced.

Full finite/health/fuel/thermal/q/g and actual land/catch assertions remain.
Ship's incoming touchdown is captured before contact handling zeros velocity;
the final onTheGround flag is not a landing criterion. Existing 10km orbital
aim and separate tighter1km health test remain; exact missing historical matrix
Ship aim bytes are unknown. Four mocked units prove clock/control/contact
sequencing only and are explicitly not flight acceptance.

Independent high source/code review accepted the implementation after correcting
an invented onTheGround/final-pose invariant to actual incoming contact rules.
Reviewer ran no tests/builds/flight. Final build299.8/300kB and scoped lint pass.

Reviewed real selections, original30s case, one worker, zero added retries:

- Ship/landing-burn: PASS1 selected;29 unselected; actual production physics.
- Super Heavy/landing-burn: FAIL1 selected;29 unselected; crashed3.608s.
  No descent initialization correction existed in this baseline. Static review
  confirms missing phase always enters align-boost even for descending auto-land.
  A reviewed mode-aware correction must preserve explicit boostback priority.

[Exact input/result pins](result.json) and raw logs/exits retain failures.
The remaining rows, supported orbital routing/targeting, complete gate,
coverage/goldens/mutations, visual/frame, phase and release remain open.
