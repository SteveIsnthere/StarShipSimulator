import { assertBuild, BRICK_GAP, MAX_BRICK_STEPS, type BrickBuild, type BrickLayout, type BrickStep } from './brickMotion';
import { createGpuTimer } from './gpuTimer';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';

export interface BrickDrawMetric {
	cpuMs: number;
	gpuMs?: number;
	sampled?: boolean;
	timerSupported?: boolean;
	disjoint?: boolean;
}

export interface BrickRenderer {
	/** Size the surface to the area in CSS px and lay the grid over it. */
	layout(layout: BrickLayout, dpr: number): void;
	/** Upload a build. Once per build, never per frame. */
	build(build: BrickBuild): void;
	/** One frame: one uniform and one instanced draw. */
	draw(seconds: number, sampleCompletion?: boolean): BrickDrawMetric;
	destroy(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('brick field could not allocate a shader');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const detail = gl.getShaderInfoLog(shader) ?? 'unknown shader compile error';
		gl.deleteShader(shader);
		throw new Error(detail);
	}
	return shader;
}

function stepTable(steps: readonly BrickStep[]): Float32Array {
	const table = new Float32Array(MAX_BRICK_STEPS * 3);
	steps.forEach((step, index) => table.set(step, index * 3));
	return table;
}

/** A WebGL2 brick field on `canvas`, drawn in `color` (linear 0..1 RGB). Throws when WebGL2 or the program is unavailable. */
export function createBrickRenderer(canvas: HTMLCanvasElement, color: readonly [number, number, number]): BrickRenderer {
	const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
	if (!gl) throw new Error('WebGL2 is unavailable');
	let vertex: WebGLShader | null = null;
	let fragment: WebGLShader | null = null;
	let program: WebGLProgram | null = null;
	let corners: WebGLBuffer | null = null;
	let vao: WebGLVertexArrayObject | null = null;
	let timer: ReturnType<typeof createGpuTimer> | undefined;
	const destroy = () => {
		if (gl.isContextLost()) return;
		timer?.destroy();
		if (vao) gl.deleteVertexArray(vao);
		if (corners) gl.deleteBuffer(corners);
		if (program) gl.deleteProgram(program);
		if (vertex) gl.deleteShader(vertex);
		if (fragment) gl.deleteShader(fragment);
		vao = null; corners = null; program = null; vertex = null; fragment = null;
	};
	try {
		vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
		fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
		program = gl.createProgram();
		if (!program) throw new Error('brick field could not allocate a program');
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'unknown brick field link error');
		corners = gl.createBuffer();
		if (!corners) throw new Error('brick field could not allocate a buffer');
		vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, corners);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		const corner = gl.getAttribLocation(program, 'a_corner');
		gl.enableVertexAttribArray(corner);
		gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
		gl.useProgram(program);
		const linked = program;
		const u = (name: string) => gl.getUniformLocation(linked, name);
		const time = u('u_time');
		gl.uniform3f(u('u_color'), color[0], color[1], color[2]);
		gl.uniform1f(u('u_gap'), BRICK_GAP);
		// Bricks never overlap; blending only composes their premultiplied light over the page.
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		let instances = 0;

		return {
			layout(layout, dpr) {
				const width = Math.max(1, Math.round(layout.width * dpr));
				const height = Math.max(1, Math.round(layout.height * dpr));
				if (canvas.width !== width) canvas.width = width;
				if (canvas.height !== height) canvas.height = height;
				gl.viewport(0, 0, width, height);
				gl.uniform2f(u('u_area'), Math.max(layout.width, 1), Math.max(layout.height, 1));
				// The backing store rounds to whole pixels; snap to what it actually got.
				gl.uniform1f(u('u_dpr'), width / Math.max(layout.width, 1));
				gl.uniform2f(u('u_origin'), layout.originX, layout.originY);
				gl.uniform1f(u('u_size'), layout.size);
				gl.uniform1i(u('u_cols'), layout.cols);
				gl.uniform1i(u('u_rows'), layout.rows);
				instances = layout.cols * layout.rows;
			},
			build(build) {
				assertBuild(build);
				gl.uniform1f(u('u_build'), build.build);
				gl.uniform1f(u('u_hold'), build.hold);
				gl.uniform1f(u('u_clear'), build.clear);
				gl.uniform1f(u('u_rest'), build.rest);
				gl.uniform1f(u('u_ragged'), build.ragged);
				gl.uniform1f(u('u_idle'), build.idle);
				gl.uniform1f(u('u_built'), build.built);
				gl.uniform3fv(u('u_land'), stepTable(build.land));
				gl.uniform1i(u('u_land_count'), build.land.length);
				gl.uniform3fv(u('u_lift'), stepTable(build.lift));
				gl.uniform1i(u('u_lift_count'), build.lift.length);
			},
			draw(seconds, sampleCompletion = false) {
				if (sampleCompletion && timer === undefined) timer = createGpuTimer(gl);
				const timing = timer?.poll();
				const start = performance.now();
				const sampled = sampleCompletion && (timer?.begin() ?? false);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.uniform1f(time, seconds);
				gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instances);
				if (sampled) timer?.end();
				return { cpuMs: performance.now() - start, sampled, timerSupported: timer !== undefined ? timer !== null : undefined, ...timing };
			},
			destroy,
		};
	} catch (error) {
		destroy();
		throw error;
	}
}
