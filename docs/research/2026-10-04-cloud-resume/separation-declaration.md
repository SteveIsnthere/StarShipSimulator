# Default booster-separation first catch-plane and terminal trace

Declared 2026-10-04 in cloud. This is one **not yet executed** research flight. The lead assigns its serial CPU/source slot after the RTLS implementation owner finishes. No runtime changes, historical harness execution, alternative seed, or acceptance rerun is authorized by this declaration.

## Evidence and discrimination

The retained [attempt3 outcome](../2026-10-03-vehicle-realism/booster-planner-attempt3-outcome.md) reports default separation crash at341.6s, terminal hull altitude12.289977m and x0.827373m relative tower. Its endpoint fuel0 and failed engine masks are terminal disposition outputs. The older [integration disposition](../2026-10-03-vehicle-realism/integration-regression-disposition.md) called the crash “fuel-exhausted”; that causal description is unsupported and superseded by the explicit qualification in attempt3. This trace records first fuelRunOut, preceding live inventory and the first terminal event's retainedPropellant to distinguish real starvation from release. RTLS's pressure breakup21.275s does not explain separation's later impact.

Falsifiable targets: missed position/velocity/pitch catch gate; fixed arrival horizon expiry and resulting permanent shutdown; actual ignition/support loss; insufficient delivered gimbal/fin/RCS/throttle authority; actual fuel exhaustion versus terminal release; source invalidation or late/no plan. An observed outcome selects the next bounded diagnosis/fix, not a new limit or preset.

## Frozen flight contract

Construct unchanged `createScenarioVehicle(PRESETS.find(id==='booster-sep'))`, without an explicit seed; assert DEFAULT_SEED=0x57414c4b. Enable autoLandOn only. Run actual production `step(previous,1/120,undefined,vehicle)` once with no state injection, additional forecast, candidate override, mechanical-budget change or physical change. Stop first secured catch, terminal capture/crash/breakup, or the original900s maximum. Record first downward lug-plane crossing and continue **the same flight** if it misses. No second run follows from a red outcome.

Keep all original acceptance bounds: plane120m, lug65/71×V3height, lateral position≤2.25m, |lug vx|≤1m/s, −4.5≤lug vy<0m/s, |pitch|≤5°. Preserve the actual model, source lineage/provenance, four search-plus-observer advances per120Hzcall,16candidate cap, paid ignition and actuator slew, damage/material domains and global hard stops. The trace reads these from production source; it changes none.

The maintained [trace source](separation-trace.ts.txt) records root/hull and rotating-lug poses, engine masks/countdowns/RNG, force/acceleration/throttle/gimbal/fin/RCS delivery, pressure/temperature/g, full damage and retained/released ledger, plan/source/predictor metadata, first ignition/horizon/miss/fuel transitions, every terminal-phase tick, exact adjacent states at transitions, one-second samples, and a bounded600row pre-terminal ring. For unsecured downward plane crossings it reproduces tower-catch's exact altitude fraction, shortest-angle pitch, interpolated hull x plus rotated lug and interpolated lug speeds, ground/failure checks and four numerical margins. A secured catch overwrites incoming velocities; the trace labels that secured endpoint and does **not** pretend those incoming gates can be reconstructed from returned state. No source callbacks or altered integration are introduced to recover them.

## Source-pinned build and run, only after the lead assigns the slot

Use a fresh output directory outside the checkout and keep it for evidence. These commands are a future run recipe, not evidence of execution. The embedded manifest is computed before esbuild reads the source; the same manifest is checked after bundling and by the harness before and after its one flight. Source files must remain immutable for the full build/run slot. Any mismatch aborts; inspect it rather than rerunning or overwriting the output.

```bash
source /workspace/cloud-bootstrap/starship-v*/activate.sh
cd /workspace/StarShipSimulator
export SEP_ROOT="$PWD"
export SEP_RUN_DIR="$(mktemp -d /tmp/separation-trace-XXXXXX)"
export SEP_OUTPUT="$SEP_RUN_DIR/trace.jsonl"
node --input-type=module <<'JS'
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
const root=process.env.SEP_ROOT, out=process.env.SEP_RUN_DIR;
if(!root || !out || process.versions.node.split('.')[0]!=='22')throw new Error('Pinned Node22/environment required');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function hashes(){
  const entries={};
  function visit(dir){
    for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const path=resolve(dir,item.name);
      if(item.isDirectory())visit(path);
      else if(item.isFile())entries[relative(root,path)]=sha(readFileSync(path));
      else throw new Error('Unexpected core entry');
    }
  }
  visit(resolve(root,'src/core'));return entries;
}
const source=resolve(root,'docs/research/2026-10-04-cloud-resume/separation-trace.ts.txt');
const pin=hashes();
writeFileSync(resolve(out,'core-hashes.json'),JSON.stringify(pin,null,2)+'\n',{flag:'wx'});
writeFileSync(resolve(out,'harness.sha256'),sha(readFileSync(source))+'\n',{flag:'wx'});
await build({stdin:{contents:readFileSync(source,'utf8'),resolveDir:dirname(source),loader:'ts',sourcefile:source},
  bundle:true,platform:'node',format:'esm',target:'node22',outfile:resolve(out,'trace.mjs'),
  define:{__SEPARATION_CORE_HASHES__:JSON.stringify(pin)}});
if(JSON.stringify(pin)!==JSON.stringify(hashes()))throw new Error('Source changed during bundle; stop');
writeFileSync(resolve(out,'bundle.sha256'),sha(readFileSync(resolve(out,'trace.mjs')))+'\n',{flag:'wx'});
JS
node "$SEP_RUN_DIR/trace.mjs" > "$SEP_RUN_DIR/stdout.txt" 2> "$SEP_RUN_DIR/stderr.txt"
```

The final source-verification row is mandatory. Preserve source/harness/bundle hashes, raw exit status/logs, first plane result and terminal ledger before interpreting the flight. This CPU diagnostic does not certify gameplay, photographs/rendering, GPU/frame budgets, Mac performance, full gate, review, merge, deployment or release. Do not claim it ran until its receipt exists.
