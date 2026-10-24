"""One bounded offline retained-data analysis; no flight, source import or profiler."""
import collections
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
receipt = base / 'default-separation-ssr-profile-receipt'
paths = [receipt / name for name in ['flight.cpuprofile', 'phases.json', 'endpoint.json', 'failure.json', 'exit-status.txt', 'before-pins.json', 'after-pins.json', 'source-unchanged.json']]
paths += [base / 'terminal-grid-separation-receipt.jsonl', Path(__file__)]
pins = {str(path.relative_to(base)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
assert (receipt / 'exit-status.txt').read_text().strip() == '1'
assert json.loads((receipt / 'before-pins.json').read_text()) == json.loads((receipt / 'after-pins.json').read_text())
endpoint = json.loads((receipt / 'endpoint.json').read_text())
witness = next(row['data'] for row in map(json.loads, (base / 'terminal-grid-separation-receipt.jsonl').read_text().splitlines()) if row['event'] == 'outcome')
differences = []
def compare(a, b, path):
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a) != set(b): differences.append({'path': path, 'reason': 'keys', 'a': sorted(a), 'b': sorted(b)})
        for key in set(a) & set(b): compare(a[key], b[key], path + '.' + key)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): differences.append({'path': path, 'reason': 'length'})
        for index, (aa, bb) in enumerate(zip(a, b)): compare(aa, bb, f'{path}[{index}]')
    elif a != b or (isinstance(a, bool) != isinstance(b, bool)):
        differences.append({'path': path, 'a': a, 'b': b})
selected = ['kinematics', 'vehicle', 'forces', 'atmosphere', 'engines', 'status', 'failures']
for state in ['current', 'previous']:
    for key in selected: compare(endpoint[state][key], witness[state][key], f'{state}.{key}')
compare(endpoint['ticks'], witness['ticks'], 'ticks')
compare(endpoint['current']['time'], witness['time'], 'current.time')
assert not differences, 'JSON-storage comparison has differences; preserve explicit failure'

profile = json.loads((receipt / 'flight.cpuprofile').read_text())
phases = json.loads((receipt / 'phases.json').read_text())
assert phases['clockCompatible'] is True
nodes = {node['id']: node for node in profile['nodes']}
parents = {child: node['id'] for node in profile['nodes'] for child in node.get('children', [])}
assert len(profile['samples']) == len(profile['timeDeltas'])
stacks = {}
for original in nodes:
    ident = original
    stack = []
    while True:
        stack.append(nodes[ident]['callFrame'])
        if ident not in parents: break
        ident = parents[ident]
    stacks[original] = stack

self_us = collections.Counter()
inclusive_us = collections.Counter()
self_samples = collections.Counter()
inclusive_samples = collections.Counter()
phase_totals = collections.Counter()
phase_functions = collections.defaultdict(collections.Counter)
grid_paths = collections.Counter()
ssr_self_us = 0
time = profile['startTime']
def key(frame): return frame['url'] + '::' + frame['functionName']
for sample, delta in zip(profile['samples'], profile['timeDeltas']):
    assert delta >= 0
    time += delta
    stack = stacks[sample]
    names = {frame['functionName'] for frame in stack}
    phase = next((item['phase'] for item in phases['phases'] if item['startUs'] <= time <= item['endUs']), 'outside-declared-step-spans')
    phase_totals[phase] += delta
    leaf = key(stack[0])
    self_us[leaf] += delta
    self_samples[leaf] += 1
    if '/node_modules/vite-node/' in stack[0]['url'] or '/node_modules/vitest/' in stack[0]['url'] or '/node_modules/vite/' in stack[0]['url']:
        ssr_self_us += delta
    for function in {key(frame) for frame in stack}:
        inclusive_us[function] += delta
        inclusive_samples[function] += 1
    for function in ['terminalBurnDue', 'landingBurnStartAltitude', 'commandGridTorque', 'writeFlightGridForces', 'writeDamageControls', 'loadedRootAngle', 'steelProofStrength', 'pressureInLayer', 'isaAtmosphereInto']:
        if function in names: phase_functions[phase][function] += delta
    if 'writeFlightGridForces' in names:
        # Disjoint ancestry buckets, never add inclusive parents together.
        if 'commandGridTorque' in names: bucket = 'commandGridTorque-query'
        elif 'align' in names: bucket = 'other-align-delivered-query'
        elif any('forecast' in name.lower() or 'rollout' in name.lower() for name in names): bucket = 'forecast-rollout-query'
        else: bucket = 'other-live-fall-query'
        grid_paths[bucket] += delta

def rows(counter, count_counter, limit=35):
    return [{'function': name, 'weightedSampleUs': value, 'samples': count_counter[name]} for name, value in counter.most_common(limit)]
result = {
    'scope': 'offline existing failed standalone SSR diagnostic only; no flight/profile/test execution and no timing acceptance',
    'originalDiagnosticExitStatus': 1,
    'storageComparison': {'label': 'JSON-storage comparison; signed-zero identity unrecoverable', 'selectedTrees': selected, 'currentAndPrevious': True, 'ticksAndTime': True, 'differences': differences, 'bitExactWitnessClaim': False, 'preservedRawFailure': json.loads((receipt / 'failure.json').read_text())},
    'profile': {'startTime': profile['startTime'], 'endTime': profile['endTime'], 'samples': len(profile['samples']), 'weightedSampleUs': sum(profile['timeDeltas']), 'phaseClockCompatible': True, 'samplingIsNotCallCounting': True, 'phaseAttribution': 'sample endpoint in recorded consecutive pre-step phase span; boundary/intra-step work not separately resolved', 'phaseTotalsUs': dict(phase_totals), 'phaseInclusiveUs': dict(phase_functions), 'gridDisjointAncestryUs': dict(grid_paths), 'identifiableSsrModuleLeafUs': ssr_self_us, 'ssrCaution': 'zero/low module leaf cost cannot prove zero transformed import-binding overhead or reproduce Vitest worker contention', 'topSelf': rows(self_us, self_samples), 'topInclusive': rows(inclusive_us, inclusive_samples)},
    'inputPins': pins,
}
output = base / 'ssr-profile-retained-analysis-v1.json'
with output.open('x') as stream: json.dump(result, stream, indent=2)
print(json.dumps({'output': str(output), 'jsonStorageDifferences': len(differences), 'weightedSampleUs': sum(profile['timeDeltas']), 'samples': len(profile['samples'])}))
