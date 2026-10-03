# Shared dynamics Refactor checkpoint

Approved Phase7 Task4 extraction only, before attached stack forces. Existing paid prepare, translation Verlet, airspeed/gust phase, rotation Verlet and breakup operations are moved in exact order. Each body owns its workspace; two interleaved paid force preparations do not overwrite one another. Step retains command/actuator/catch/bookkeeping ordering. No separate production integrator.

Build/lint0,14truthIN;47focused checks across8files pass. New independent preserved Ship arithmetic proof spans1200boundary cases (exact every-field equality,0ULP) and retained7680Ship step proof also passes. All eight original Ship and both actual booster goldens pass without any fixture change or tolerance change. RED missing extraction API precedes production edits. Exact raw reports and source pins retained here.

No attached hotstage mission, functional two-vehicle UI, complete coverage/release gate/review/main merge/deploy is claimed. Those remain Phase7 tasks, followed by8/9. Hosted Task3snapshot coverage failure is still an explicit release obligation.
