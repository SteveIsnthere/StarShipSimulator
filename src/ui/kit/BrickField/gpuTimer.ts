interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export function createGpuTimer(gl: WebGL2RenderingContext) {
	const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
	if (!extension) return null;
	let pending: WebGLQuery[] = [];
	let current: WebGLQuery | null = null;
	const clear = () => {
		for (const query of pending) gl.deleteQuery(query);
		pending = [];
	};
	return {
		begin() {
			if (current || pending.length >= 2) return false;
			current = gl.createQuery();
			if (!current) return false;
			gl.beginQuery(extension.TIME_ELAPSED_EXT, current);
			return true;
		},
		end() {
			if (!current) return;
			gl.endQuery(extension.TIME_ELAPSED_EXT);
			pending.push(current);
			current = null;
		},
		poll(): { gpuMs?: number; disjoint?: boolean } {
			if (!pending.length) return {};
			if (gl.getParameter(extension.GPU_DISJOINT_EXT)) { clear(); return { disjoint: true }; }
			const query = pending[0];
			if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return {};
			const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
			pending.shift();
			gl.deleteQuery(query);
			return { gpuMs: nanoseconds / 1_000_000 };
		},
		destroy() {
			if (current) { gl.endQuery(extension.TIME_ELAPSED_EXT); gl.deleteQuery(current); current = null; }
			clear();
		},
	};
}
