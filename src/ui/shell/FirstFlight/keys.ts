/**
 * The keys the hint quotes, each as `resolveKeyDown` ($app/input) receives it.
 *
 * A hint is a help screen with fewer words, and it drifts the same way: 2021's
 * guide named keys the code did not bind. So the key is stated here once and
 * tests/ui/shell/FirstFlight.test.tsx resolves each one through the real
 * binding table and checks it does what the hint says.
 */
export interface HintKey {
  /** What the key cap shows. */
  readonly cap: string;
  /** `KeyboardEvent.key`, as the binding table reads it. */
  readonly key: string;
  /** What it does, in the hint's words. */
  readonly does: string;
}

export const HINT_KEYS: readonly HintKey[] = [
  { cap: 'Space', key: ' ', does: 'engines' },
  { cap: 'W', key: 'w', does: 'throttle up' },
];
