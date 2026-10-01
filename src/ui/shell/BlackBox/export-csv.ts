/**
 * The black box's export: the recording as a CSV file the player keeps.
 *
 * The RECORDER, not the display copy — the file is the data (radians, newtons,
 * every digit), which tests/ui/blackbox.test.ts holds `toCsv` to bit for bit.
 */
import type { Recorder } from '$app/recorder';
import { csvFileName, toCsv } from '$ui/blackbox';

/**
 * Hand the browser a download.
 *
 * The anchor is created, put IN the document and clicked rather than rendered:
 * Firefox ignores a click on a detached anchor, and a link that is always in
 * the DOM is stale from the moment the next flight starts. The object URL is
 * revoked a minute later, not on the next tick — a revoke racing a
 * multi-megabyte blob cancels the download that was still reading it.
 */
export function downloadCsv(recorder: Recorder, scenarioId: string): void {
  const blob = new Blob([toCsv(recorder)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = csvFileName(scenarioId, recorder.time[recorder.time.length - 1] ?? 0);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
