# Historical modernization approvals — recorded 2026-10-03

Non-executable history. These experiments and diagnoses are closed, superseded or parked. Current instructions live in GOAL; do not run an old sweep, restore Earth rotation, apply an old patch, or treat these completed approvals as a new task.

## Earlier resume decisions — approved by Steve, 2026-10-01

Historical approval wording follows. Its one-verification/automatic-stop restrictions are superseded by Standing autonomy approval above; its physical and assertion boundaries remain binding.

Steve's latest “sounds good” approves both recommendations previously presented. Do not ask again:

1. Replace only the obsolete >1500 s coast characterization with a calculated firing-geometry witness. Retain burn sequence, duration bounds and total-flight checks. The observed pad gap8,811,094.695 m matched predicted8,811,117.731 m; do not turn that observed23 m agreement into a tuned tolerance. Derive the witness's bound from the existing mechanical prediction/conic contract.
2. Bring Task 1b Earth rotation forward and finish Tasks 1+1b as one coherent Fidelity change. Re-measure aim, reserve health, flux and range under the rotating model as the phase plan specifies. Permit exactly one further named 300 km verification after that change and other focused acceptance. Three authorized diagnoses plus accidental run 4 are recorded. This is one verification after run 4, not a fourth diagnosis campaign. If it fails, stop that named work and report; independent authorized tasks may continue. If it passes, ordinary required release gates may include it; no reruns for luck.

The1533 K tile limit, one-km health, ten-km landing, burn bounds, ±3° authority, source bridge and general diagnosis rule remain binding. Both approved changes are implemented in the current checkpoint: Earth's projected rate is on and the obsolete coast floor is replaced by the firing-geometry witness. Their remaining flight acceptance is governed by First task.

Pre-flight source check: NASA TR R-474 equation 2.12 folds the normal-force
angle above 90 degrees (`alphaPrime = pi - |alpha|`); its crossflow coefficient
uses `M * |sin(alpha)|` (equation 2.3), and Figure 4 contains the finite-length
factor. Record these conventions and any necessary ruling in the implementation
ledger before writing tests; do not blindly extrapolate the plan's shorthand
into negative drag or reversed lift. Source: https://ntrs.nasa.gov/api/citations/19770026166/downloads/19770026166.pdf.

Phase 6 closure completed: main merge, gate, push, deploy, live smoke and roadmap tick. Its completed plan was already closed out. Retain the bounded plume history. A recurrent failure follows the 2026-10-02 standing review rule; do not redo the finished phase.

## Earlier model approvals — Steve, 2026-10-01

These model/characterization approvals remain binding. References to the original diagnosis budget are historical; Standing autonomy approval governs new cycles.

Steve approved both recommended exceptions (“sounds good”) after the goal was blocked. These exceptions are resolved; do not ask again. Full remaining scope stays Phases 6b, 7, 8 and 9. Phase 6 is done and must not be redone.

1. **Predictor characterization:** replace only the obsolete assertion `landingBurnStartAltitude(3, 200_000, 4_000, 25, scratch) === null`. The new physical axial drag stops the mathematical descent inside the unchanged60 s cap. Add an independent forward mechanical integration witness that reaches the target stop within the existing burn-agreement tolerance (max0.1% of burn distance or2 m), and assert its duration is below60 s. Use the shared force function; do not create a second aerodynamic model. Preserve the one-engine/full-tank null assertion, BURN_STEP_CAP=1200, and every genuine cap/null case. Separately retain a real-step witness that this start breaks up: a mechanical prediction is not a flightworthiness claim. The predictor’s force-only contract remains; full-trajectory structural/thermal rejection is not added by this approval. Never disable failures in the real-step witness.
2. **Crossflow factor:** correct the plan’s all-Mach0.63 assumption using NASA R474 §2.3.2 printed pp17–18 and Figures4/6. Retain0.63 for low crossflow Mach and recover1 at hypersonic crossflow. The Ship-specific transonic bridge is a declared tier-B engineering assumption, not measured data and not an optimization against heating.

**Bridge fixed before testing:** use crossflow Mach `Mn = M * abs(sin(alpha))`; eta=0.63 for Mn<=0.4; eta=1 for Mn>=1.6; between them use `t=(Mn-0.4)/1.2` and `eta=0.63+0.37*t*t*(3-2*t)`. The0.4–1.6 interval comes from Figure6’s available crossflow-Mach range for fineness10/12; applying its endpoints and a smooth monotone bridge to fineness50/9 is the explicit assumption. This does not model Figure6’s transonic dip, which lacks Ship-specific data. Cite that limitation. Do not subsequently reshape the bridge to pass heating, landing, truth or goldens; an independently established source/model defect is reviewed and recorded first.

The narrow approvals do not change the1,533 K tile limit, one-km health check,10 km landing acceptance,900 s reentry harness, reserve-health fraction, coverage floors, golden tolerances, control authority or diagnosis budget. Re-measure reserve/aim under the corrected model as already authorized. Existing source-derived coefficient tests remain truth; new body-force literal cases may be updated only to independently calculate the newly approved eta, retaining every assertion’s force/sign/continuity property. All analytic tests and reference bands remain binding. The prescribed eight-angle sweep must be run for the corrected model, since earlier tables describe the superseded constant factor; retain those tables as evidence, not current acceptance.

**Implementation status:** both approvals above are implemented and focused tests passed. Their prescribed eta red/green cycle and predictor witnesses are retained in the progress evidence. The thermal-envelope diagnosis exhausted its original three attempts; First task now governs the rotating range failure after the HUD/view fixes. The 2026-10-02 standing approval governs further reviewed cycles; reruns for luck remain prohibited.

**Recovery:** Tasks1+1b checkpointc24235f iscommitted/pushed. Unfinished Task2 plus the unconnected Task3 primitive are preserved in docs/research/2026-10-02-phase6b-body-moment/task2-3-in-progress-source.patch with task2-3-source-sha256.json (eight files, base556617d); forward/index and reverse/worktree checks pass. The earlier six-file patch/pins remain historical. Never apply either over existing changes. Thepatchbase c242 hasthesamecorebytesaftertest-only/doccommits. The coherent Tasks1+1b checkpoint commits runtime,tests,Linuxfixtures and audits on this branch and is pushed. Use the branch’s committed source. The historical in-progress-source.patch and sourcepins retain the initial uncommitted checkpoint for provenance;never apply that old patch over current committed work.
