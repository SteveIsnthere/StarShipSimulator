# Recording extension consumer — camera harness diagnosis1

Fullunits1994pass/1fail: camera frame-rate equality in reentry600s. The test helper stopped1/9playback after its fixed200000display frames, yielding44444of72000simulation steps (370.37sof600). Normal/stalling/9x completed72000. Added exact completion assertions first; watchedred expected72000/received44444 confirms the guard causes the mismatch.

Fix: retain bounded execution, derive frame budget from requestedsteps,DT,knownminimumframe time1/60,slow/warp and one accumulator-remainder frame;retainold200000minimum. All exact camera equalities,framing bounds and negative controls remain. New completion assertions prevent earlytermination masking a camera proof. No runtime or goldenvalue changes;this adapts the helper to the explicitly approved longer recording. Not a physical or flight-limit increase.

Focusedgreen67/67 (camera40 plusgolden27) passes. Fresh independent reviewer confirms324001derivedframebudget for600s/1/9, current frame/warp/cap assumptions hold, and exactcompletion checks strengthenproof. No finding rejected. Fullunits rerun afterbuild/lint is inprogress.

HostedCI37017954727 atc24235f fails the unchanged30000ms callback timeout in reentrycameraequality,1994otherunitspass. Localfullunits1995pass is retained,notclaimedhostedgreen. Diagnosis2:the singlecallback flies fourcomplete600s runs;hostedtotalunits341.6s. Split intooneit.each proofperplaybackcomparison withsameexactcompletion/equalityassertions and30stimeout. Everycomparison keepssteadyreference;allthree playbackcases remain. Verify onisolatedc242 worktree withownnode_modules toexcludeunfinishedTask2physics;thenpushtest-onlyrepair. No timeout/retry/physicalbound increased.

CIrepair isolatedc242withownnode_modules:buildpasses,camera56+golden27=83pass (35.61s totalfilegroup). Freshscope reviewer confirmsall8×3cases/exactassertions/30stimeout unchanged,onlygroupingchanged. Moretotalreferenceflights are a recordedcost;hostedtimingmustverifyfix. Notphaseapproval.
