# Early acquisition — next bounded implementation packet

2026-10-18 UTC. Production checkpoint:
`df16fb2c59cf69883cf1440d90795b135dfc2a40` on `claude/visuals`.
This directory preserves unimplemented design and existing evidence. No new
acquisition controller, RED boundary test or flight pass is claimed.

Read the [design](design.md) and [independent HIGH design review](review.md).
The next action is a small pre-terminal boundary witness, then implementation,
focused checks and independent source/readiness review before a changed flight.
Use the original case limits and keep all catch clauses.

[Recorded constraints](preterminal-constraint.json) copy the 3 s sample from the
consumed terminal-coallocation trace. They are not an exact historical full
state: reconstructed unrecorded fields must be labelled as such. The trace
SHA-256 is `44e330d11bf965dae3470f4c4605fe8d56010dfb8707377a9105d8473ed82687`.
No historical flight is to be rerun to recreate this sample.

The retained `terminal-regressions` log/JSON/exit record 9/9 existing terminal
envelope tests at source `3fa8c522f4dd3e2c6170988ee967a3f39a9a8b2e`, before
the later scoped root-kernel Refactor. This is a separate source epoch and no
acquisition or whole-phase acceptance. Source correspondence is not transferred
merely because the log is stored in this packet.

Next witness: show the recorded-constraint reconstruction remains vertically
stoppable while paid rotation/ignition lead makes delayed lateral acquisition
unsupported. Include an aligned in-envelope control, failed support/centre,
depleted RCS, zero-dt and deadline boundaries. Confirm the intended new test
path is absent before adding it; preserve all existing test suites. Obtain a
new review if the concrete source departs from the reviewed nominal design.

Reentry's approximately 716 km miss and the held orbital feasibility witness
remain separate tasks. This packet closes no roadmap acceptance checkbox.
