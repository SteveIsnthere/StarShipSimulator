# Independent residual allocation review

Reviewer: fresh subagent coupled_fin_review, read-only, no tests/edits/flights.

Attempt1 cannot establish physical infeasibility. RCS received total demand while fins contributed; impulse share describes usage, not a minimum budget. Preserve the deadzone. Subtract actual moment after unchanged slew and final mapping, clamp residual to existing authority, keep fin command independent. Integrated moments and newly issued commands must be labeled separately; exclude breakup-reset mass.

Code reinspection: achieved-extension subtraction after slew, shared wind/attack snapshot, independent fin saturation, consumption and manual cancellation coherent. One stale-command defect: precisionAlignment cleared the marker without clearing the associated raw request. A subsequent alignment could leave this unmarked and allow >800kN through the proportional path. Clear only marked raw requests before clearing the marker; witness superseding alignment and retained ordinary proportional commands. Fixed before attempt2; watched-red log retained.

Reinspection confirmed the narrow stale-request fix and no remaining preflight blocker. Attempt2 again failed after exhaustion, with nearly identical lifetime and impulse. Reviewer supports attempt3 prescribed fixed eight-angle pair sweep stopping Mach5/failure, with stage/signed torque traces. All-red alone would establish failure of candidate plus retained controller, not automatically physical-authority infeasibility: deadzone offset, trajectory and finite slew remain possible confounds. Fresh disposition required.
