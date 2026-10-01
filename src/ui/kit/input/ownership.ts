/**
 * Generic input ownership boundary.
 *
 * The registry knows only about modality owners and release reasons. It does
 * not know about FlightSim, stores, routes or product controls; app adapters
 * supply those callbacks at the edge. Release is deliberately momentary-only
 * so a lifecycle boundary cannot silently reset a latched value such as
 * throttle or a persisted setting.
 */

export type InputOwner = 'keyboard' | 'pointer' | 'gamepad' | 'touch' | 'gyro' | 'replay';

export type InputBoundaryReason =
	| 'window-blur'
	| 'document-hidden'
	| 'pagehide'
	| 'route-change'
	| 'session-change'
	| 'capture-change'
	| 'device-disconnect'
	| 'pointer-cancel';

export type InputRelease = (reason: InputBoundaryReason) => void;

interface Registration {
	id: number;
	owner: InputOwner;
	release: InputRelease;
}

/** Small, deterministic registry shared by the app-level input provider. */
export class InputOwnershipRegistry {
	private nextId = 0;
	private registrations: Registration[] = [];
	private releaseDepth = 0;

	register(owner: InputOwner, release: InputRelease): () => void {
		const registration: Registration = { id: ++this.nextId, owner, release };
		this.registrations.push(registration);
		let registered = true;
		return () => {
			if (!registered) return;
			registered = false;
			this.registrations = this.registrations.filter(entry => entry.id !== registration.id);
			// A producer can disappear without a browser keyup/pointercancel. Its
			// momentary controls must be released before the owner is forgotten.
			if (this.releaseDepth === 0) release('session-change');
		};
	}

	releaseMomentary(reason: InputBoundaryReason): void {
		// Snapshot the list so a release callback may unregister itself without
		// changing which owners receive this boundary.
		this.releaseDepth++;
		try {
			for (const { release } of [...this.registrations]) release(reason);
		} finally {
			this.releaseDepth--;
		}
	}

	get size(): number {
		return this.registrations.length;
	}
}
