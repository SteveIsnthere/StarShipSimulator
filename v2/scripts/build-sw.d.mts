/**
 * Types for the build script, so tests can import it without `any` leaking in.
 *
 * The script itself is plain .mjs because it runs under node during the build,
 * before any TypeScript exists. This declaration is the seam.
 */
export declare function collectAssets(dir: string, base?: string): Promise<string[]>;
export declare function renderServiceWorker(assets: string[], version: string): string;
export declare function buildServiceWorker(
  distDir: string,
): Promise<{ assets: string[]; version: string }>;
