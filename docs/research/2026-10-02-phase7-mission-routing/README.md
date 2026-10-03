# Phase 7 selected-model mission routing checkpoint

Base: `edd2974`, on `claude/super-heavy`. Task5 remains in progress; nothing in this checkpoint is merged to main or visible on the live site.

The framework-free mission controller owns an actual selected model and either the standalone fixed loop or the shared two-body mission loop. Its stable selected loop serves existing binders/recorders. Selection never steps either body; both bodies continue after separation; Stage persists through a pause; the recorder callback sees the current physical mission and selected state on every fixed step. The original intro is unchanged. Custom booster loads retain the physical3400t capacity.

Direct player commands invalidate pending/accepted booster return authority before application. The all-engine route uses actual13-engine return ignition. Centre3/inner10/outer20 group commands operate on real engine states, cancel pending ignition and preserve failed engines. Attached automatic flight modes remain unavailable because the physical demonstration is manually staged until release.

Fidelity tier, approved Phase7Task5: free-flight booster guard/hold/ascent use actual thrust, grid/gimbal/moving-COM allocation and paid proportional RCS. The shared speed guard previously discarded its model at the thrust helper; the optional model now reaches the existing helper, with the default Ship path unchanged. Return guidance retains exact exclusive priority so live and forecast laws remain equivalent. Utility ascent preserves the existing altitude programme and fuel threshold without using Ship flap locks.

RED evidence: controller module absent; eight routing/provenance defects; missing grouped route and attached mode incorrectly enabled; three utility modes bypassed. GREEN evidence:52focused checks before three additional priority/manual/fuel controls, then70checks across routing, utility, independent Ship proofs and all ten golden replays. Build/lint exit0, truth14/14IN before and after. The RCS witness captures the command before actuation because the existing actuator consumes it; no assertion was weakened. No golden file, digest, tolerance, physical authority, scenario start or work limit changed.

Next: split the500-line session before integration, connect the canonical controller/debug route, retain independent body flight histories, then expose model-aware controls/HUD and both real rendered bodies. Task6 still owes full coverage, gate, browser/mutation/truth and fresh release review. Hosted snapshot coverage deficits remain mandatory; these focused results are not release approval.

## Session composition follow-up

Preferences moved from the500-line session to `session/preferences.ts`; session now432lines. Existing116headless/session-shell checks pass after the split. The actual session now composes the mission controller for single-body presets, exposes its selected model and canonical `advance`, uses actual-model controls, and resets step counters on restart. The mounted frame loop calls that same advance route. Debug fixed steps may use a canonical callback, so selected vehicles and missions are advanced by their real controller rather than a compatibility Ship default; the old debug API fallback remains for existing callers.

RED session witness failed because the real session lacked the selected model; RED debug mission witness failed because compatibility stepping never advanced either mission body. Final134checks across session/shell/controller/debug pass; build/lint exit0. Headless canvas warnings are jsdom's existing unavailable canvas implementation, not a browser proof. First-load JS290.9kB remains under300kB.

Next expose hot-stage and vehicle-selection commands in the session, preserve separate body recorder/watch/timeline histories and rebind cached HUD/controls when selection changes. Render both physical bodies, fit early staging, show actual booster grouped engine activity/failures and catch outcomes, retain custom booster capacity. No real browser acceptance, full gate, coverage closure, phase review, main merge or live deploy is claimed here.
