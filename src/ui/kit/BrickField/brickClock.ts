/**
 * One timeline for every brick field on the page. The launch curtain covers the screen,
 * the loading screen mounts under it, the curtain reveals: if each field kept its own
 * clock the build would restart at the hand-off. A field that mounts while another is
 * running, or within `CONTINUE_MS` of the last one leaving, continues the same build;
 * otherwise the build starts from its first moment.
 */
const CONTINUE_MS = 1000;

let epoch: number | null = null;
let holders = 0;
let releasedAt = Number.NEGATIVE_INFINITY;

/** Join the shared timeline; call the returned function to leave it. */
export function holdBrickClock(now: number = performance.now()): () => void {
	if (holders === 0 && (epoch === null || now - releasedAt > CONTINUE_MS)) epoch = now;
	holders += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		holders -= 1;
		releasedAt = performance.now();
	};
}

/** Seconds into the shared build at `now`. */
export function brickClockSeconds(now: number = performance.now()): number {
	return epoch === null ? 0 : Math.max(0, (now - epoch) / 1000);
}

/** Tests only: forget the shared timeline. */
export function resetBrickClockForTest(): void {
	epoch = null;
	holders = 0;
	releasedAt = Number.NEGATIVE_INFINITY;
}
