import { expect, it, vi } from 'vitest';
import { createBrickRenderer } from './renderer';

function fixture(failure: 'fragment' | 'link' | 'buffer') {
	const shaders = [{ stage: 'vertex' }, { stage: 'fragment' }];
	let index = 0;
	const program = {};
	const gl = {
		VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
		createShader: () => shaders[index++], shaderSource: vi.fn(), compileShader: vi.fn(),
		getShaderParameter: (shader: typeof shaders[number]) => failure !== 'fragment' || shader.stage !== 'fragment',
		getShaderInfoLog: () => 'compile failed', deleteShader: vi.fn(),
		createProgram: () => program, attachShader: vi.fn(), linkProgram: vi.fn(),
		getProgramParameter: () => failure !== 'link', getProgramInfoLog: () => 'link failed',
		deleteProgram: vi.fn(), createBuffer: () => null, deleteBuffer: vi.fn(), deleteVertexArray: vi.fn(), isContextLost: () => false,
	};
	const canvas = { getContext: () => gl } as unknown as HTMLCanvasElement;
	return { canvas, gl, shaders, program };
}

it('releases the earlier shader when fragment compilation fails', () => {
	const { canvas, gl, shaders } = fixture('fragment');
	expect(() => createBrickRenderer(canvas, [1, 1, 1])).toThrow('compile failed');
	expect(gl.deleteShader).toHaveBeenCalledTimes(2);
	for (const shader of shaders) expect(gl.deleteShader).toHaveBeenCalledWith(shader);
});

it.each(['link', 'buffer'] as const)('releases program and both shaders after %s failure', failure => {
	const { canvas, gl, program } = fixture(failure);
	expect(() => createBrickRenderer(canvas, [1, 1, 1])).toThrow();
	expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
	expect(gl.deleteShader).toHaveBeenCalledTimes(2);
});
