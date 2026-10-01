/** Shared by binder.test.ts and binder.timing.test.ts. */
import { vi } from 'vitest';
import { createHudBinder, type TextTarget } from '$hud/binder';
import { READOUTS } from '$hud/readouts';
import type { MapContext } from '$hud/trajectory-draw';

/** A text node that records how many times it was written, and to what. */
export function counter(): TextTarget & {
  writes: number;
  text: string | null;
} {
  return {
    writes: 0,
    text: null,
    get textContent() {
      return this.text;
    },
    set textContent(next: string | null) {
      this.text = next;
      this.writes += 1;
    },
  };
}

export function harness() {
  const elements = new Map<
    string,
    { value: ReturnType<typeof counter>; unit: ReturnType<typeof counter> }
  >();
  for (const readout of READOUTS) elements.set(readout.id, { value: counter(), unit: counter() });

  const resolve = vi.fn((id: string) => {
    const pair = elements.get(id);
    return { value: pair?.value ?? null, unit: pair?.unit ?? null };
  });

  return { elements, resolve, binder: createHudBinder({ resolve }) };
}

/**
 * A recording 2D context for the whole-HUD frame benchmark.
 *
 * Deliberately does the cheapest possible thing per call: the point of putting
 * the map in the frame benchmark is to measure the MAP's arithmetic — the
 * decimation, the extent, the projection of three hundred points — not
 * Chromium's rasteriser, which is not running in Node anyway.
 */
export function recordingMapContext(width: number, height: number): MapContext {
  return {
    canvas: { width, height },
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    globalAlpha: 1,
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    stroke: () => {},
    fill: () => {},
    fillText: () => {},
    setLineDash: () => {},
  };
}
