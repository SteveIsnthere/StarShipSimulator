import {defineConfig} from 'vitest/config';
import base from '../../../vitest.config.ts';
export default defineConfig({resolve:base.resolve??{},test:{environment:'node',maxWorkers:1,include:["docs/research/2026-10-04-cloud-resume/held-interface-IotQ4h.test.ts", "docs/research/2026-10-04-cloud-resume/held-interface-uWyBjg.test.ts", "docs/research/2026-10-04-cloud-resume/held-interface-qUEHOb.test.ts", "tests/proofs/unpowered-fall-preparation.test.ts", "tests/core/fall-continuation.test.ts", "tests/proofs/acceleration-components.test.ts"]}});
