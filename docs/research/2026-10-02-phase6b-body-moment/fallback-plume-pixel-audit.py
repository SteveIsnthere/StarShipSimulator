"""Audit saved captures against the unchanged browser detector, offline."""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

BASE = Path(__file__).parent / 'fallback-browser-cycle1-attempt3'
report = json.loads((BASE / 'report.json').read_text())
rows = []
for test in report['tests']:
    attachments = {item['name']: item for item in test['results'][0]['attachments']}
    for name, item in attachments.items():
        if not name.endswith('-measurement'):
            continue
        measurement = json.loads(item['body'])
        prefix = name.removesuffix('-measurement')
        paths = {kind: BASE / 'html-report' / attachments[prefix + '-' + kind]['path']
                 for kind in ['subject', 'background', 'frozen-repeat']}
        assert paths['subject'].read_bytes() == paths['frozen-repeat'].read_bytes()
        subject = np.asarray(Image.open(paths['subject']).convert('RGB')).astype(float)
        background = np.asarray(Image.open(paths['background']).convert('RGB')).astype(float)
        height, width, _ = subject.shape
        query = measurement['spec']['extents']['plume']
        region = query['region']
        x0 = max(0, math.floor(region['x'] * width))
        y0 = max(0, math.floor(region['y'] * height))
        x1 = min(width, math.ceil((region['x'] + region['width']) * width))
        y1 = min(height, math.ceil((region['y'] + region['height']) * height))
        s = subject[y0:y1, x0:x1]
        b = background[y0:y1, x0:x1]

        def qualifies(pixels):
            luma = pixels @ np.array([0.299, 0.587, 0.114])
            return (luma >= query['minLuma']) | (pixels[:, :, 0] - pixels[:, :, 2] >= query['orWarmth'])

        qualified = qualifies(s)
        excluded = qualified & qualifies(b)
        mask = qualified & ~qualifies(b)
        ys, xs = np.nonzero(mask)
        expected = measurement['extent']
        observed = {'left': int(xs.min()) + x0, 'right': int(xs.max()) + x0,
                    'top': int(ys.min()) + y0, 'bottom': int(ys.max()) + y0,
                    'count': int(mask.sum())}
        for key, value in observed.items():
            assert value == expected[key], (test['projectName'], name, key, value, expected[key])
        band_end = min(y1 - 1, observed['top'] + query['topBandPx'])
        by, bx = np.nonzero(mask[:math.floor(band_end) - y0 + 1])
        assert int(bx.max() - bx.min() + 1) == expected['bandWidthPx']
        delta = np.max(np.abs(s - b), axis=2)
        changed = delta > 0
        distal = np.indices(mask.shape)[0] + y0 > observed['top'] + measurement['scale']['vehicleHeightPx']
        distal_changed = distal & changed
        rows.append({'project': test['projectName'], 'test': test['title'],
                     'step': measurement['telemetry']['world.updatedFrameCount'],
                     'altitude': measurement['telemetry']['kinematics.altitude'],
                     'observed': observed, 'bandWidthPx': expected['bandWidthPx'],
                     'backgroundExcluded': int(excluded.sum()),
                     'distalChangedPixels': int(distal_changed.sum()),
                     'distalQualifiedPixels': int((distal & mask).sum()),
                     'distalMaxSubjectLuma': float((s @ np.array([0.299, 0.587, 0.114]))[distal_changed].max()) if distal_changed.any() else None,
                     'distalMaxSubjectWarmth': float((s[:, :, 0] - s[:, :, 2])[distal_changed].max()) if distal_changed.any() else None,
                     'distalMaxRgbChange': float(delta[distal_changed].max()) if distal_changed.any() else None})

output = {'scope': '24 frozen image pairs; original detector reproduced exactly; no changed acceptance',
          'rows': rows}
(BASE.parent / 'fallback-plume-pixel-audit.json').write_text(json.dumps(output, indent=2) + '\n')
print('Original detector exactly reproduced for', len(rows), 'samples; all frozen PNG pairs identical')
for row in rows:
    if row['project'] == 'iphone-landscape' and row['altitude'] > 100000:
        print(json.dumps(row))
