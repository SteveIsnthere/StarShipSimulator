/**
 * Loads the 2021 backend into a sandboxed VM context so tests can compare the
 * port against the real thing rather than against a transcription of it.
 *
 * The legacy files are read-only reference (CLAUDE.md); nothing here writes to
 * them. They are plain scripts that assign to globalThis, so a VM context is
 * exactly the right shape: run them, then read the context's globals.
 *
 * Two things must be stubbed for initBackEnd() to complete:
 *   - `document`, because initEngine/initControlInput reach into the DOM to
 *     configure the throttle and pitch sliders (wall 2, in the wild).
 *   - nothing else: getRad lives in physics.js, which we load alongside.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));

/** A DOM stub recording attribute writes, so we can assert on them if needed. */
function stubDocument() {
  const elements = new Map<string, { attributes: Record<string, unknown>; value: string }>();
  return {
    getElementById(id: string) {
      let el = elements.get(id);
      if (!el) {
        el = { attributes: {}, value: '0' };
        elements.set(id, el);
      }
      return {
        setAttribute(name: string, value: unknown) {
          el!.attributes[name] = value;
        },
        get value() {
          return el!.value;
        },
      };
    },
    _elements: elements,
  };
}

export interface LegacyContext {
  [key: string]: unknown;
}

/**
 * Run the listed legacy scripts in one context and return its globals.
 * Defaults to the set needed for a fully initialised backend.
 */
export function loadLegacy(
  scripts: readonly string[] = ['backend/physics.js', 'backend/initBackEnd.js'],
  { init = true }: { init?: boolean } = {},
): LegacyContext {
  const sandbox: Record<string, unknown> = {
    Math,
    Infinity,
    NaN,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    console,
    document: stubDocument(),
  };
  sandbox['globalThis'] = sandbox;
  const context = createContext(sandbox);

  for (const script of scripts) {
    runInContext(readFileSync(REPO + script, 'utf8'), context, { filename: script });
  }
  if (init) runInContext('initBackEnd()', context, { filename: '<init>' });

  return context as LegacyContext;
}
