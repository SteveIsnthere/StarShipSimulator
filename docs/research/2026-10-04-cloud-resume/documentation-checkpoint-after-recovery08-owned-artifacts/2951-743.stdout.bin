// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { installMemoryStorage } from '../memory-storage';

const probe = vi.hoisted(() => ({ requested: false, loads: 0, events: [] as string[] }));
vi.mock('$app/debug-request', () => ({ wantsSimDebug: () => probe.requested }));
vi.mock('$app/debug', () => {
  probe.loads++;
  return { installSimDebug: () => { probe.events.push('debug'); return true; } };
});
vi.mock('$view/app', () => ({
  createView: async () => { probe.events.push('view'); throw new Error('view boundary'); },
}));
import { createSession } from '$ui/session/session';

describe('optional session diagnostics', () => {
  it('loads diagnostics only when requested and installs before view setup', async () => {
    installMemoryStorage();
    const canvas = document.createElement('canvas');
    await expect(createSession().mount(canvas)).rejects.toThrow('view boundary');
    expect(probe.loads).toBe(0);
    expect(probe.events).toEqual(['view']);

    probe.requested = true;
    probe.events.length = 0;
    await expect(createSession().mount(canvas)).rejects.toThrow('view boundary');
    expect(probe.loads).toBe(1);
    expect(probe.events).toEqual(['debug', 'view']);
  });
});
