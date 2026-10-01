export function sanitizeTransitionName(value: string): string {
	const safe = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
	return `aircraft-${safe || 'unknown'}`;
}
