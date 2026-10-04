# Independent HIGH observer repair1 narrow review

Whole90 startup-clock finding is closed. Observer SHA c2c4f19550a49aff785ec46ee200fe8783fddc7ca0ea246599d3743be1117cf2 now registers owned detached group/session lineage and can discover orphaned members. No execution/check/import was performed.

HOLD remains on identity-bound witness. The selected fresh group witness may be any current member rather than an already captured PID/start identity. If the old group empties and its numeric group/session IDs are reused between scans, with the replacement leader exiting before the next snapshot, no leader row triggers recycling rejection; new members with later start times pass and may be wrongly admitted/signaled. Require a fresh original leader with exact captured start, or a member whose PID/start/group/session already belongs to known owned identities. If members remain but no such witness exists, record sticky group uncertainty, do not admit or signal new members, and do not clear/green that group. Numeric lineage alone cannot prove continuous ownership.

The claimed repeated per-PID cleanup is also not implemented: current TERM/KILL loops only scan/reconcile after their one initial signal. Within unchanged5s/2s deadlines, signal newly discovered identity-verified owned members, retaining all uncertainty errors and exact pre-signal identity checks. No additional time or unrelated group signal is acceptable.

Stage/contract unchanged and prior review applies. No preparation execution grant yet. No product/native build/control/coverage acceptance.
