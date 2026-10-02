import * as C from '../../../src/core/constants';
import { createScenarioState, getScenario } from '../../../src/core/scenarios';
import { createBurnScratch, createFallResult } from '../../../src/core/control/guidance-physics';
import { predictEntryRangeInto } from '../../../src/core/control/entry-range';
import { rad } from '../../../src/core/units';
const s=createScenarioState(getScenario('reentry')!);
const scratch=createBurnScratch(), out=createFallResult();
for(let i=0;i<30;i++) predictEntryRangeInto(s,C.ENTRY_LIFT_ANGLE,scratch,out);
const t=performance.now();
for(let i=0;i<200;i++) {
 predictEntryRangeInto(s,rad(C.ENTRY_LIFT_ANGLE-C.aeroDescentMaxCorrectionAngle),scratch,out);
 predictEntryRangeInto(s,rad(C.ENTRY_LIFT_ANGLE+C.aeroDescentMaxCorrectionAngle),scratch,out);
}
console.log('milliseconds per two-prediction update',(performance.now()-t)/200);
const { toggleAutoLand } = await import('../../../src/core/control/commands');
const { step } = await import('../../../src/core/step');
let flying=createScenarioState(getScenario('reentry')!);
toggleAutoLand(flying);
for(let i=0;i<120;i++) flying=step(flying,1/120);
const start=performance.now();
for(let i=0;i<1200;i++) flying=step(flying,1/120);
console.log('milliseconds per entry step, including forecast updates',(performance.now()-start)/1200);
