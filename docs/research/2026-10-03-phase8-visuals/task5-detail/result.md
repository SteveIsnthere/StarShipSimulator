# Vehicle detail and framing checkpoint

Base: `9e4a4d1`, branch `claude/visuals`. Task 5 remains open.

Startup model-scale welds, skirt, projected actual engine mounts, booster steel rim and independently articulated Ship fins are implemented. Fin roots formerly hid inside the hull; two RED witnesses established wrong roots and stations. Depiction now uses hull flanks and existing physical stations without changing simulation authority. Attached-stack framing eases from actual hull bounds toward native FOV as real body spacing reaches the existing handoff.

Initial build:299.0kB;479 affected units. Original/all-five browser campaign:88 passed, zero failures/retries,12.8min. All30actual six-scene PNGs inspected:27in browser gallery, three iPhone landscape gallery-cache misses inspected directly. Staging shows both full hulls; real catch remains at tower. Explicit staging/catch bounds plus actual catch-lug constraint passed30/allfive.

Inspection exposed a one-pixel iPhone landscape landing nose clip. Extending the full-body assertion to all scenes produced a genuine RED at the top edge. Edge guard constrains only a standalone Ship follow-camera crossing, keeping native FOV and velocity. Its first version changed intro framing; exact-intro comparison caught that RED. The protected actual demo path is excluded. The original intro camera and native FOV now match at all1800real steps on each of five canvas sizes. No core, golden, scenario or legacy source changed.

Final build299.2kB;480affected units across33files; lint0errors with existing BlackBox warning. Terminal55915 COMPLETE0. Full corrected acceptance campaign64788 is RUNNING,88checks/allfive/source frozen, output `cycle1-attempt2`, raw `browser-cycle1-attempt2.txt`. Poll the same terminal; do not restart. Task-done5/commit completion remains owed after the whole brief passes. Task6 quality/performance, whole-phase release/review/main/deploy and Phase9 remain.

Raw debug stepping supplies no render worlddt; these body captures do not prove continuous engine effects. Task6 must use genuine full-session ticks for effect and full-frame performance acceptance. Short-landscape HUD allocation remains named Phase9 work.
