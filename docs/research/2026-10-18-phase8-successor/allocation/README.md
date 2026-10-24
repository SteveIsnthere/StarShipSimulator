# Reused render projection outputs

Source basis is the committed `8126077a` implementation, not the missing later
workspace. Five source files migrate the six existing render call sites to
factory-owned scratch. `camera-projection.ts` owns the unchanged coordinate
expressions; `camera.ts` re-exports both APIs. Interaction/test callers retain
the original allocating `worldToScreen` API and fresh-object ownership.

The world owns separate horizon/shadow/pad/scenery outputs, each effect driver
owns its ground point, and each scene runtime owns its projected vehicle point.
The existing separate normalized nose output remains separate. No core,
camera law, physical input, shader, particle/culling decision or budget changes.

Recorded checks on managed Linux x86-64 / Node 22.23.3:

- Baseline build: exit 0.
- Necessary negative control: all five new/extended witnesses failed on the
  absent writer before implementation. A readonly viewport fixture typing
  correction was made before changed build; no acceptance assertion changed.
- Changed build: exit 0; 299.8/300.0 kB first-load JS gzip, fonts/audio pass.
- Focused exact-projection/ownership, real world/effect and mounted paused
  redraw/resize checks: 5/5 pass.
- Expanded camera/zoom/world/particles/engine/damage/mount checks: 85/85 across
  nine files, exit 0, ordinary SSR fallback, one worker, original case timeout,
  zero added retries, no coverage.
- Scoped ESLint: exit 0.

[Result record](result.json) pins changed source/tests, runner/config, commands,
raw exits/reports and actual environment. The separate original
`source-basis.json` describes the pre-change source; it is not a current hash
manifest after implementation.

Independent high-depth code review found no actionable code issue. The final
read-only metadata check verified all 12 input pins, 15 artifact hashes/sizes,
raw exits, JSON counts and runtime metadata; disposition is unconditional for
this durable WIP checkpoint. [Review](review.md). This is allocation discipline and focused regression acceptance only:
no measured frame improvement, optical acceptance, complete gate, phase or
release acceptance is claimed. No old flight or performance episode was retried.
