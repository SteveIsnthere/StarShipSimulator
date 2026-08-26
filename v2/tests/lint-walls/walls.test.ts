/**
 * The walls themselves are under test.
 *
 * Each fixture in ./fixtures violates exactly one of the SEVEN walls in
 * CLAUDE.md — six from the 2021 autopsy, and wall 7 added by M8.1 when sound
 * arrived.
 * We feed each one to ESLint through the real production config and assert that
 * the matching rule fires. A wall that stops rejecting its fixture fails here.
 *
 * Fixtures are linted via `lintText` with a synthetic `filePath` under src/core/,
 * so config *scoping* is exercised too — not just the rule definitions. The file
 * never exists on disk; ESLint resolves config from the path alone.
 */
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const CWD = fileURLToPath(new URL('../../', import.meta.url));

const eslint = new ESLint({ cwd: CWD });

/** Lint fixture text as though it lived at `asPath`, relative to v2/. */
async function lintAs(fixture: string, asPath: string) {
  const code = await readFile(FIXTURES + fixture, 'utf8');
  const [result] = await eslint.lintText(code, { filePath: CWD + asPath });
  return result!.messages;
}

const IN_CORE = 'src/core/__wall_fixture__.ts';

describe('the seven walls reject their fixtures inside core/', () => {
  it('wall 1: no view/ ui/ hud/ app/ PIXI or Svelte imports', async () => {
    const messages = await lintAs('wall1-boundary.ts', IN_CORE);
    const hits = messages.filter((m) => m.ruleId === 'no-restricted-imports');
    // pixi.js, $view/camera and ../../hud/binder — all three.
    expect(hits).toHaveLength(3);
    expect(hits[0]!.severity).toBe(2);
    expect(hits[0]!.message).toMatch(/Wall 1/);
  });

  it('wall 2: no document or window', async () => {
    const messages = await lintAs('wall2-dom.ts', IN_CORE);
    const hits = messages.filter((m) => m.ruleId === 'no-restricted-globals');
    expect(hits.map((m) => m.message).join('\n')).toMatch(/Wall 2/);
    // one `document`, one `window`
    expect(hits).toHaveLength(2);
  });

  it('wall 3: no Math.random', async () => {
    const messages = await lintAs('wall3-random.ts', IN_CORE);
    const hits = messages.filter((m) => m.ruleId === 'no-restricted-properties');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.message).toMatch(/Wall 3/);
  });

  it('wall 4: no Date.now, performance.now or new Date', async () => {
    const messages = await lintAs('wall4-clock.ts', IN_CORE);
    const props = messages.filter((m) => m.ruleId === 'no-restricted-properties');
    const syntax = messages.filter((m) => m.ruleId === 'no-restricted-syntax');
    // Date.now + performance.now
    expect(props).toHaveLength(2);
    // new Date()
    expect(syntax).toHaveLength(1);
    expect([...props, ...syntax].every((m) => /Wall 4/.test(m.message))).toBe(true);
  });

  it('wall 5: no setTimeout or setInterval', async () => {
    const messages = await lintAs('wall5-timers.ts', IN_CORE);
    const hits = messages.filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(hits).toHaveLength(2);
    expect(hits.every((m) => /Wall 5/.test(m.message))).toBe(true);
  });

  it('wall 6: no globalThis assignment', async () => {
    const messages = await lintAs('wall6-globals.ts', IN_CORE);
    const hits = messages.filter((m) => /Wall 6/.test(m.message));
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it('wall 7: no audio/ imports', async () => {
    // M8.1. Sound is an OUTPUT of the simulation, never an input to it — if the
    // audio layer wants a physical value that is not in SimState, it derives it
    // in `audio/` rather than adding it to core and moving the goldens.
    const messages = await lintAs('wall7-audio.ts', IN_CORE);
    const hits = messages.filter((m) => m.ruleId === 'no-restricted-imports');
    // The alias form and the relative form — both have to be closed, because
    // either one would open the boundary.
    expect(hits).toHaveLength(2);
    expect(hits.every((m) => /Wall 7/.test(m.message))).toBe(true);
    expect(hits[0]!.severity).toBe(2);
  });
});

describe('wall 6 is repo-wide, not core-only', () => {
  // The other five walls guard the protected zone. Wall 6 guards all of v2/,
  // because the 2021 tree's 355 globals were spread across every layer.
  for (const path of ['src/app/__wall_fixture__.ts', 'src/view/__wall_fixture__.ts']) {
    it(`rejects globalThis assignment in ${path}`, async () => {
      const messages = await lintAs('wall6-globals.ts', path);
      expect(messages.filter((m) => /Wall 6/.test(m.message)).length).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('walls 1-5 and 7 are scoped to core/', () => {
  // view/ legitimately imports PIXI and touches the DOM. If these fired
  // everywhere the config would be unusable and would get switched off.
  it('allows PIXI imports outside core/', async () => {
    const messages = await lintAs('wall1-boundary.ts', 'src/view/__wall_fixture__.ts');
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(0);
  });

  it('allows document and window outside core/', async () => {
    const messages = await lintAs('wall2-dom.ts', 'src/hud/__wall_fixture__.ts');
    expect(messages.filter((m) => m.ruleId === 'no-restricted-globals')).toHaveLength(0);
  });

  it('allows requestAnimationFrame outside core/', async () => {
    const messages = await lintAs('wall5-timers.ts', 'src/app/__wall_fixture__.ts');
    expect(messages.filter((m) => m.ruleId === 'no-restricted-syntax')).toHaveLength(0);
  });

  it('allows audio/ imports outside core/', async () => {
    /*
      The scoping half of wall 7, and the half worth having. `ui/` has to import
      the audio engine to wire the mute toggle, and `app/` has to drive it from
      the tick — a wall that fired everywhere would be unusable and would get
      switched off, which is how walls actually die.
    */
    for (const path of ['src/ui/__wall_fixture__.ts', 'src/app/__wall_fixture__.ts']) {
      const messages = await lintAs('wall7-audio.ts', path);
      expect(messages.filter((m) => m.ruleId === 'no-restricted-imports'), path).toHaveLength(0);
    }
  });
});

describe('clean core/ code passes every wall', () => {
  it('reports nothing', async () => {
    const messages = await lintAs('clean.ts', IN_CORE);
    expect(messages).toEqual([]);
  });
});
