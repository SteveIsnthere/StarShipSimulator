# Lightweight catch progress and bounded optical witness

2026-10-18 UTC. This is a presentation/debug change, not a core physics change.
`flightProgress()` reads the current selected live loop on demand and returns
five scalars without recursively flattening planner/future trees. Catch setup
changes only the per-tick read and predicate keys: canonical step(1), predicate
order, first-terminal stop, 108,000 cap and final full telemetry remain intact.

Evidence:

- Fresh startup reconciliation/actual Chromium functional check passed. Fetch
  of `audit/remaining-work` verified exact `FETCH_HEAD` 8126077a; the checkout's
  restricted fetch refspec creates no `origin/audit/remaining-work` tracking ref.
  Initial verification against that absent ref failed closed before source edit;
  verification against the actual fetched commit then passed. No source reset.
- Baseline build passed. Missing-getter RED: all ten original new tests failed
  specifically with missing `flightProgress`. After implementation, independent
  HIGH review requested the real canonical two-body delegation witness; added.
- First focused cohort: 30/31 pass, failed because the existing session-loading
  mock omitted `attachSceneWitness`, already requested by session startup. Added
  that export while retaining the exact `['debug','view']` ordering assertion;
  premature witness invocation would add an unexpected event and still fail.
- Corrected build/scoped lint exit 0 and focused cohort 31/31 exit 0, including
  eleven new snapshot/traversal/terminal/canonical-controller tests. Synthetic
  terminal boundary tests are not flight acceptance. All failed logs retained.
- Independent HIGH review accepted code/mock correction and bounded readiness.
  `final-presentation.json` now uses the existing immediate JSON writer so actual
  renderer identity survives the list reporter; no measurement policy changes.
- One changed catch optical case reports pass in 18.5 s (20.6 s command), original
  60 s case limit, one worker, zero retries. Saved shell exit is 0 and Playwright
  `.last-run.json` is passed. The execution tool's final status is nevertheless 1;
  this receipt conflict is preserved, not rerun for luck or called a whole pass.
- Before/after source and build manifests match. Actual Chromium 151.0.7922.34,
  Linux x64, Node 22.23.3, Xeon Platinum 8573C, 1280×720/DPR1; unmasked renderer
  confirms ANGLE/Vulkan SwiftShader. Viewport is 1280×720; the actual post-catch
  canvas/image is 1280×347 at DPR1. Complete state, body-presence PNG, same-state
  absence PNG and runtime/presentation receipts are preserved in catch-artifacts.

The image shows a real airborne secured booster and tower. This closes the
specific catch capture omission at this source/configuration, with the command
receipt discrepancy stated. It does not accept reference realism, developed
exhaust, natural-damage motion, phone/reduced behavior, frame/GPU/cadence budgets,
full gate, Phase 8, main or deployment. Prior five-scene images keep their earlier
source scope; no single current-source six-scene campaign is claimed.

At this capture, C1 source/tests were uncommitted WIP; the later C1 checkpoint
preserves them without accepting the full phase. The full capture source manifest pins
that local input delta; the committed documentation basis alone does not restore
it. [Result and hash manifest](result.json). Next: measured C1/C2 descending-row
diagnosis and paid orbital feasibility, plus remaining C3 references/motion and
actual full/reduced budgets. Do not reimplement this getter or rerun this case
unchanged simply to obtain a different outer tool status.
