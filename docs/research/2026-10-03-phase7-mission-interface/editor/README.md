# Selected vehicle flight setup

Super Heavy setup uses its actual 3,400 t capacity; an explicit Ship preset retains the Ship limit. Blank setup keeps the selected physical vehicle. Configuring a staged body starts that real standalone model at its current pose, speed, fuel and wind. Starting hot staging clears stale form fields.

The initial capacity and selected-body routing failures are preserved. The first routing correction still lost the booster origin through the parser; the final correction retains it only when no different preset was picked. Existing blank Ship parsing remains unchanged.

Final Mac build and lint exit 0, first-load JS 292.9/300 kB. Four focused files pass all 68 tests. jsdom reports its existing missing canvas context; these checks do not prove rendered canvas behavior. Phase 7 remains unmerged; two-body rendering/camera/catch and real browser witnesses are next, followed by complete coverage and release.
