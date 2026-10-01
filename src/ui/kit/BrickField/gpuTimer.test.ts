import { expect, it, vi } from 'vitest';
import { createGpuTimer } from './gpuTimer';

function fixture() {
	const gl = {
		QUERY_RESULT_AVAILABLE: 1, QUERY_RESULT: 2,
		getExtension: () => ({ TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 }),
		getParameter: vi.fn(() => false),
		createQuery: vi.fn(() => ({})), beginQuery: vi.fn(), endQuery: vi.fn(), deleteQuery: vi.fn(),
		getQueryParameter: vi.fn((_: object, parameter: number): boolean | number => parameter === 1 ? false : 500_000),
	};
	return { gl, timer: createGpuTimer(gl as unknown as WebGL2RenderingContext)! };
}

it('never reads a result before availability and converts nanoseconds to milliseconds', () => {
	const { gl, timer } = fixture();
	timer.begin(); timer.end();
	expect(timer.poll()).toEqual({});
	expect(gl.getQueryParameter).not.toHaveBeenCalledWith(expect.anything(), gl.QUERY_RESULT);
	gl.getQueryParameter.mockImplementation((_, parameter) => parameter === 1 ? true : 500_000);
	expect(timer.poll()).toEqual({ gpuMs: 0.5 });
	expect(gl.deleteQuery).toHaveBeenCalledOnce();
});

it('discards invalid clock samples instead of accepting a false fast result', () => {
	const { gl, timer } = fixture();
	timer.begin(); timer.end();
	gl.getParameter.mockReturnValue(true);
	expect(timer.poll()).toEqual({ disjoint: true });
	expect(gl.deleteQuery).toHaveBeenCalledOnce();
	expect(gl.getQueryParameter).not.toHaveBeenCalled();
});

it('bounds pending queries and releases them on cleanup', () => {
	const { gl, timer } = fixture();
	timer.begin(); timer.end(); timer.begin(); timer.end();
	expect(timer.begin()).toBe(false);
	timer.destroy();
	expect(gl.deleteQuery).toHaveBeenCalledTimes(2);
});
