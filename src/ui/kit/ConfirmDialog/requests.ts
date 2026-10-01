export interface ConfirmOptions {
	title: string;
	body?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
	acknowledgeOnly?: boolean;
	/**
	 * Which button holds initial focus, and so answers Enter / gamepad A. Defaults to
	 * `confirm`. A destructive request whose accidental confirmation loses work passes
	 * `cancel`, so a key press that opened it cannot also carry it out.
	 */
	defaultAction?: 'confirm' | 'cancel';
}

export interface PendingConfirmRequest extends ConfirmOptions {
	resolve: (ok: boolean) => void;
}

let pushRequest: ((request: PendingConfirmRequest) => void) | null = null;
let openRequests = 0;

/** True while any confirmation is open or queued: callers that own global keys stand down. */
export function hasOpenConfirmDialog(): boolean {
	return openRequests > 0;
}

export function registerConfirmHost(push: (request: PendingConfirmRequest) => void): () => void {
	pushRequest = push;
	return () => {
		if (pushRequest === push) pushRequest = null;
	};
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
	return new Promise(resolve => {
		if (!pushRequest) {
			resolve(window.confirm([options.title, options.body].filter(Boolean).join('\n\n')));
			return;
		}
		openRequests++;
		let settled = false;
		pushRequest({
			...options,
			resolve: ok => {
				if (!settled) {
					settled = true;
					openRequests--;
				}
				resolve(ok);
			},
		});
	});
}

export function alertDialog(options: Omit<ConfirmOptions, 'acknowledgeOnly' | 'cancelLabel'>): Promise<void> {
	return confirmDialog({ confirmLabel: 'OK', ...options, acknowledgeOnly: true }).then(() => undefined);
}
