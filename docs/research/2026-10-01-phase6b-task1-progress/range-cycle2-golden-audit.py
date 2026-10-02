"""Compare downloaded Linux artifacts with HEAD; never generates a fixture."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

baseline = sys.argv[3] if len(sys.argv) > 3 else '080f1088ec07863751ffd8b2fa8bf8106d4b22af'
artifact = Path(sys.argv[1])
destination = Path(sys.argv[2])
fixture_dir = Path('tests/golden/fixtures')
expected = sorted(p.name for p in fixture_dir.glob('*.json'))
assert sorted(p.name for p in artifact.glob('*.json')) == expected

def samples(data):
    return [dict(data['constant'], **dict(zip(data['keys'], row))) for row in data['rows']]

def digest(raw):
    start = raw.index(b'\n "rows": [\n')
    return hashlib.sha256(raw[start:]).hexdigest()

report = []
for name in expected:
    path = fixture_dir / name
    old_raw = subprocess.check_output(['git', 'show', baseline + ':' + str(path)])
    new_raw = (artifact / name).read_bytes()
    old, new = json.loads(old_raw), json.loads(new_raw)
    for key in ['scenario', 'steps', 'dt', 'sampleEvery', 'seed', 'setup']:
        assert old[key] == new[key], (name, key)
    before, after = samples(old), samples(new)
    assert len(before) == len(after)
    added = sorted(set(after[0]) - set(before[0]))
    removed = sorted(set(before[0]) - set(after[0]))
    assert added == ['autopilot.entryRangeCountdown', 'autopilot.entryRangeTrim'], (name, added)
    assert not removed, (name, removed)
    changed = {}
    for index, (b, a) in enumerate(zip(before, after)):
        for key in b:
            if b[key] == a[key]:
                continue
            summary = changed.setdefault(key, {'firstSample': index, 'changedSamples': 0, 'maxAbsDelta': 0})
            summary['changedSamples'] += 1
            if type(a[key]) in (int, float) and type(b[key]) in (int, float):
                summary['maxAbsDelta'] = max(summary['maxAbsDelta'], abs(a[key] - b[key]))
    end_keys = ['kinematics.altitude', 'kinematics.speedX', 'kinematics.speedY',
                'vehicle.propellantMass', 'status.landed', 'failures.crashed', 'failures.inFlightBreakUp']
    report.append({'id': new['scenario'], 'rows': len(after), 'addedKeys': added,
                   'beforeDigest': digest(old_raw), 'afterDigest': digest(new_raw),
                   'changedFields': changed,
                   'endBefore': {key: before[-1][key] for key in end_keys},
                   'endAfter': {key: after[-1][key] for key in end_keys}})
    print(new['scenario'], len(changed), 'changed fields', report[-1]['endAfter'])
destination.write_text(json.dumps({'platform': 'x86-64 Linux / Node22, hosted run36985191265',
                                  'baseline': baseline,
                                  'recordingSnapshot': '764d19145edb06553500d256bb425d6c0f1669f3',
                                  'fixtures': report}, indent=2) + '\n')
