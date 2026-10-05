# Actual history attempt: pre-child failure

The single history attempt failed before spawning its history child: root exit 1 in 2.620473361 seconds. The owner passed deadlineMs 850000 to runOwnedCommand; the unchanged public helper rejects values above 300000 at scripts/bench/owned-command.mjs:59, before its spawn at line 69. No history process receipt, semantic result, native import or paid history execution was produced. Owner processes and owned-final are empty.

The immutable owner receipt incorrectly says paidHistoriesExecuted:true because the field was derived from mode. This is a reporting defect, not evidence of execution. The parent independent receipt explicitly records the limitation. My earlier source/input readiness reviews missed the incompatible helper deadline; those historical reviews remain unchanged.

The retained complete-before/after source and tool snapshots are exactly equal; selected-before/after are equal. Both compiled audits match the accepted retained 17-file graph, 57 original compiler IDs, 56 mapped originals and one certified generated runtime. These provenance checks do not prove native semantics. Parent post-exit evidence records both observed PID/start identities absent (caller 128141/8030166, owner 128142/8030187). No executing owned child was registered.

A distinct candidate may tighten the child deadline to 300000 without changing the helper, full original 18 cases, 1,080,000-step elliptical history, arithmetic, comparisons or acceptance limits. Flags must distinguish requested mode, attempted command, recorded child identity, raw completion and complete semantic result. No physics, timing, coverage or release approval follows from this failure review.
