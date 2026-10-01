import { describe, expect, it, vi } from 'vitest';
import { InputOwnershipRegistry, type InputBoundaryReason, type InputOwner } from './ownership';

const owners: InputOwner[] = ['keyboard', 'pointer', 'gamepad', 'touch', 'gyro', 'replay'];
const reasons: InputBoundaryReason[] = [
	'window-blur', 'document-hidden', 'pagehide', 'route-change',
	'session-change', 'capture-change', 'device-disconnect', 'pointer-cancel',
];

describe('InputOwnershipRegistry', () => {
	it.each(owners)('registers and releases the %s owner', owner => {
		const registry = new InputOwnershipRegistry();
		const release = vi.fn();
		const unregister = registry.register(owner, release);

		registry.releaseMomentary('window-blur');
		expect(release).toHaveBeenCalledExactlyOnceWith('window-blur');
		expect(registry.size).toBe(1);

		unregister();
		expect(release).toHaveBeenLastCalledWith('session-change');
		registry.releaseMomentary('document-hidden');
		expect(release).toHaveBeenCalledTimes(2);
		expect(registry.size).toBe(0);
	});

	it.each(reasons)('delivers %s to every current owner exactly once', reason => {
		const registry = new InputOwnershipRegistry();
		const releases = owners.map(() => vi.fn());
		owners.forEach((owner, index) => registry.register(owner, releases[index]));

		registry.releaseMomentary(reason);

		for (const release of releases) expect(release).toHaveBeenCalledExactlyOnceWith(reason);
	});

	it('snapshots registrations so self-unregistering cannot starve a sibling', () => {
		const registry = new InputOwnershipRegistry();
		const first = vi.fn(() => unregisterFirst());
		const second = vi.fn();
		const unregisterFirst = registry.register('keyboard', first);
		registry.register('pointer', second);

		registry.releaseMomentary('pointer-cancel');

		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();
		expect(registry.size).toBe(1);
	});

	it('releases a momentary control when its owner unregisters', () => {
		const registry = new InputOwnershipRegistry();
		const release = vi.fn();
		const unregister = registry.register('touch', release);

		unregister();

		expect(release).toHaveBeenCalledExactlyOnceWith('session-change');
	});
});
