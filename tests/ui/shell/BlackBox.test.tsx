// @vitest-environment jsdom
/**
 * The black box surface: a kit Dialog over a real headless session.
 *
 * The chart module (./plots, which pulls in uPlot) is mocked, and the mock's
 * factory counts its own evaluation — that is the lazy-load claim stated in a
 * test: nothing evaluates it until the dialog opens on a recording.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRecorder, type Recorder } from '$app/recorder';
import { DT } from '$app/loop';
import { createScenarioState, getScenario } from '$core/scenarios';
import { step } from '$core/step';
import * as cmd from '$core/control/commands';
import { DIALOG_TESTIDS } from '$ui/testids';
import { BlackBox } from '$ui/shell/BlackBox/BlackBox';
import { displayRecording, formatValue, unwrap } from '$ui/shell/BlackBox/channels';
import type { PlotsInput } from '$ui/shell/BlackBox/plots';
import { renderWithSession } from './render';

const charts = vi.hoisted(() => {
  const handle = { setGhost: vi.fn(), destroy: vi.fn() };
  return {
    loaded: vi.fn(),
    handle,
    drawPlots: vi.fn(async (_host: HTMLElement, _input: unknown) => handle),
  };
});

vi.mock('$ui/shell/BlackBox/plots', () => {
  charts.loaded();
  return { drawPlots: charts.drawPlots };
});

/** A few seconds of a real launch, recorded. */
function flown(seconds: number): Recorder {
  const recorder = createRecorder();
  let s = createScenarioState(getScenario('launch-pad')!);
  cmd.toggleAutoTakeOff(s);
  for (let i = 0; i < seconds / DT; i++) {
    s = step(s, DT);
    recorder.sample(s);
  }
  return recorder;
}

const FLIGHT = flown(20);
const PREVIOUS = flown(8);

function lastInput(): PlotsInput {
  return charts.drawPlots.mock.calls.at(-1)![1] as PlotsInput;
}

// FIRST, while the mocked module has never been imported in this file.
describe('the chart code is lazy', () => {
  it('is not imported until the black box opens on a recording', async () => {
    const { session } = renderWithSession(<BlackBox />);
    session.recorder.copyFrom(FLIGHT);
    expect(screen.queryByTestId('black-box')).toBeNull();
    expect(charts.loaded).not.toHaveBeenCalled();

    act(() => session.openLayer('blackBox'));
    await waitFor(() => expect(charts.drawPlots).toHaveBeenCalledTimes(1));
    expect(charts.loaded).toHaveBeenCalledTimes(1);
    // Drawn into the dialog, from the display copy rather than the recorder.
    const [host, input] = charts.drawPlots.mock.calls[0]! as [HTMLElement, PlotsInput];
    expect(host.closest('[data-blackbox]')).not.toBeNull();
    expect(input.recorder).not.toBe(session.recorder);
    expect(input.recorder.length).toBe(FLIGHT.length);
  });
});

describe('the dialog', () => {
  it('is closed by default and opens on store.layer blackBox', () => {
    const { session } = renderWithSession(<BlackBox />);
    expect(screen.queryByTestId('black-box')).toBeNull();
    act(() => session.openLayer('menu'));
    expect(screen.queryByTestId('black-box')).toBeNull();
    act(() => session.openLayer('blackBox'));
    expect(screen.getByTestId('black-box')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Black box' })).toBeInTheDocument();
  });

  it('renders its test ids', () => {
    const { session } = renderWithSession(<BlackBox />);
    act(() => session.openLayer('blackBox'));
    for (const id of DIALOG_TESTIDS.filter((id) => id.startsWith('black-box'))) {
      expect(screen.getAllByTestId(id), id).toHaveLength(1);
    }
  });

  it('closes through the session', () => {
    const { session } = renderWithSession(<BlackBox />);
    act(() => session.openLayer('blackBox'));
    const closeLayer = vi.spyOn(session, 'closeLayer');
    fireEvent.click(screen.getByTestId('black-box-close'));
    expect(closeLayer).toHaveBeenCalledTimes(1);
    expect(session.store.getState().layer).toBeNull();
    expect(screen.queryByTestId('black-box')).toBeNull();
  });

  it('does not draw an empty recording, and says why', () => {
    charts.drawPlots.mockClear();
    const { session } = renderWithSession(<BlackBox />);
    act(() => session.openLayer('blackBox'));
    expect(screen.getByText(/Nothing recorded yet/)).toBeVisible();
    expect(screen.getByTestId('black-box-export')).toBeDisabled();
    expect(charts.drawPlots).not.toHaveBeenCalled();
  });

  it('destroys the plots when it closes', async () => {
    charts.handle.destroy.mockClear();
    const { session } = renderWithSession(<BlackBox />);
    session.recorder.copyFrom(FLIGHT);
    act(() => session.openLayer('blackBox'));
    await waitFor(() => expect(screen.queryByText('Loading plots…')).toBeNull());
    act(() => session.closeLayer());
    expect(charts.handle.destroy).toHaveBeenCalledTimes(1);
  });
});

describe('the shared cursor', () => {
  it('reads every channel at one moment, in display units, and clears when it leaves', async () => {
    const { session } = renderWithSession(<BlackBox />);
    session.recorder.copyFrom(FLIGHT);
    act(() => session.openLayer('blackBox'));
    await waitFor(() => expect(charts.drawPlots).toHaveBeenCalled());

    const readout = screen.getByTestId('black-box-readout');
    expect(readout.querySelectorAll('[data-channel]')).toHaveLength(0);
    // The hint names where the legends rest: the end of the flight.
    expect(readout.textContent).toContain(`T+${FLIGHT.time.at(-1)!.toFixed(1)}`);

    const t = FLIGHT.time[100]!;
    act(() => lastInput().onCursor(t));
    expect(readout.querySelector('.at')!.textContent).toBe(`T+${t.toFixed(2)}`);
    expect(readout.querySelectorAll('[data-channel]').length).toBeGreaterThan(10);
    const pitch = readout.querySelector('[data-channel="pitch"]')!;
    expect(pitch.textContent).toContain('Pitch');
    expect(pitch.textContent).toContain(formatValue('pitch', (FLIGHT.series['pitch']![100]! * 180) / Math.PI));
    expect(readout.querySelector('[data-channel="trueSpeed"]')!.textContent).toContain('m/s');

    act(() => lastInput().onCursor(null));
    expect(readout.querySelectorAll('[data-channel]')).toHaveLength(0);
  });
});

describe('the previous flight', () => {
  it('is offered as a ghost only when there is one, and toggles on every plot', async () => {
    const { session } = renderWithSession(<BlackBox />);
    session.recorder.copyFrom(FLIGHT);
    act(() => session.openLayer('blackBox'));
    await waitFor(() => expect(charts.drawPlots).toHaveBeenCalled());
    expect(screen.queryByRole('switch', { name: 'Previous flight' })).toBeNull();
    expect(lastInput().previous).toBeUndefined();
    act(() => session.closeLayer());

    session.previousRecorder.copyFrom(PREVIOUS);
    charts.handle.setGhost.mockClear();
    act(() => session.openLayer('blackBox'));
    await waitFor(() => expect(charts.handle.setGhost).toHaveBeenCalledWith(true));
    expect(lastInput().previous!.length).toBe(PREVIOUS.length);

    const toggle = screen.getByRole('switch', { name: 'Previous flight' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(charts.handle.setGhost).toHaveBeenLastCalledWith(false);
  });
});

describe('the export', () => {
  async function exported(presetPatch: { id: string; basedOn?: string }) {
    const { session } = renderWithSession(<BlackBox />);
    session.recorder.copyFrom(FLIGHT);
    session.store.setState({ preset: { ...getScenario('launch-pad')!, ...presetPatch } });
    act(() => session.openLayer('blackBox'));

    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:black-box';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      // Clicked while in the document (Firefox ignores a detached anchor).
      expect(this.isConnected).toBe(true);
    });

    fireEvent.click(screen.getByTestId('black-box-export'));
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    click.mockRestore();
    return { name: anchor.download, href: anchor.href, text: await blob!.text() };
  }

  it('hands over the recording as a CSV, named after the scenario and the flight', async () => {
    const { name, href, text } = await exported({ id: 'launch-pad' });
    expect(href).toBe('blob:black-box');
    expect(name).toBe(`starship-launch-pad-${FLIGHT.time.at(-1)!.toFixed(1)}s.csv`);
    const lines = text.split('\n').filter((line) => line !== '');
    expect(lines[0]).toMatch(/^time,/);
    expect(lines).toHaveLength(FLIGHT.length + 1);
    // The recording, not the display copy: pitch stays in radians.
    const pitch = lines[0]!.split(',').indexOf('pitch');
    expect(Number(lines[101]!.split(',')[pitch])).toBe(FLIGHT.series['pitch']![100]);
  });

  it('names a custom flight after the scenario it was edited from', async () => {
    const { name } = await exported({ id: 'custom', basedOn: 'booster-sep' });
    expect(name).toMatch(/^starship-booster-sep-\d+\.\ds\.csv$/);
  });
});

describe('display units', () => {
  it('unwraps ±π jumps into a continuous angle', () => {
    const series = [3.0, 3.1, -3.1, -3.0, 3.1];
    unwrap(series);
    for (let i = 1; i < series.length; i++) expect(Math.abs(series[i]! - series[i - 1]!)).toBeLessThan(Math.PI);
    expect(series[2]).toBeCloseTo(-3.1 + 2 * Math.PI);
  });

  it('copies the recording into degrees and kN without touching the original', () => {
    const before = FLIGHT.series['pitch']![50]!;
    const view = displayRecording(FLIGHT);
    expect(FLIGHT.series['pitch']![50]).toBe(before);
    expect(view.series['pitch']![50]).toBeCloseTo((before * 180) / Math.PI);
    expect(view.series['drag']![50]).toBeCloseTo(FLIGHT.series['drag']![50]! / 1000);
    expect(view.series['altitude']).toEqual(FLIGHT.series['altitude']);
    expect(view.time).toEqual(FLIGHT.time);
  });
});
