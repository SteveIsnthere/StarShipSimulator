/** Serialized research hook: actual root WebGL2 operations, timer queries only. */
export function installProgramAttribution() {
  const records = [], shaders = [], programs = [], errors = [];
  const limits = { operations: 4096, programs: 128, shaders: 256, resources: 1024, textureUnits: 64, shaderBytes: 2 * 1024 * 1024 };
  let gl, extension, armed = false, stamp, sourceBytes = 0, captureDone = false;
  const shaderIds = new WeakMap(), programIds = new WeakMap(), textureIds = new WeakMap();
  const framebufferIds = new WeakMap(), renderbufferIds = new WeakMap();
  const textures = [], framebuffers = [], renderbuffers = [];
  const bindings = new Map();
  let program = null, drawFramebuffer = null, readFramebuffer = null, renderbuffer = null, unit = 0;
  let viewport = null;
  const programId = object => objectId(object, programIds, programs, id => ({ id, shaderIds: [], links: [], activeGeneration: null }));
  const nativeRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => nativeRAF(timestamp => {
    stamp = timestamp;
    if (armed && window.__visualBudget.result().done) { armed = false; captureDone = true; }
    callback(timestamp);
  });
  function fail(message) { if (!errors.includes(message)) errors.push(message); armed = false; }
  function objectId(object, map, list, create) {
    if (!object) return null;
    let id = map.get(object);
    if (id === undefined) {
      const limit = list === shaders ? limits.shaders : list === programs ? limits.programs : limits.resources;
      if (list.length >= limit) { fail('Passive resource metadata cap exceeded'); return null; }
      id = list.length + 1; map.set(object, id); list.push(create(id));
    }
    return id;
  }
  const textureId = object => objectId(object, textureIds, textures, id => ({ id, width: null, height: null, depth: null, target: null }));
  const framebufferId = object => objectId(object, framebufferIds, framebuffers, id => ({ id, attachments: {} }));
  const renderbufferId = object => objectId(object, renderbufferIds, renderbuffers, id => ({ id, width: null, height: null, samples: null }));
  function wrap(name, before) {
    const original = gl[name];
    if (typeof original !== 'function') return;
    gl[name] = function (...args) { before(args); return Reflect.apply(original, gl, args); };
  }
  function framebufferFor(target) { return target === gl.READ_FRAMEBUFFER ? readFramebuffer : drawFramebuffer; }
  function allocation(args, kind) {
    const id = bindings.get(`${unit}:${args[0]}`);
    if (!id) return;
    const row = textures[id - 1];
    row.target = args[0];
    if (kind === 'storage2') { row.width = args[3]; row.height = args[4]; row.depth = 1; }
    else if (kind === 'storage3') { row.width = args[3]; row.height = args[4]; row.depth = args[5]; }
    else if (kind === 'image3' || args.length >= 9) { row.width = args[3]; row.height = args[4]; row.depth = kind === 'image3' ? args[5] : 1; }
    else { const source = args.at(-1); row.width = source?.videoWidth || source?.width || null; row.height = source?.videoHeight || source?.height || null; row.depth = 1; }
  }
  function attach(args, kind) {
    const id = framebufferFor(args[0]);
    if (!id) return;
    const attachments = framebuffers[id - 1].attachments;
    if (!(args[1] in attachments) && Object.keys(attachments).length >= 32) { fail('Framebuffer attachment metadata cap exceeded'); return; }
    framebuffers[id - 1].attachments[args[1]] = kind === 'texture'
      ? { kind, id: textureId(args[3]), level: args[4], target: args[2] }
      : kind === 'layer' ? { kind: 'texture', id: textureId(args[2]), level: args[3], layer: args[4] }
        : { kind, id: renderbufferId(args[3]) };
  }
  function attachmentSnapshot(id) {
    if (id === null) return { id: null, default: true, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight };
    const row = framebuffers[id - 1];
    return { id, attachments: Object.entries(row.attachments).map(([attachment, value]) => ({ attachment: Number(attachment), ...value,
      storage: value.id === null ? null : { ...(value.kind === 'texture' ? textures[value.id - 1] : renderbuffers[value.id - 1]) } })) };
  }
  function install(context) {
    gl = context;
    viewport = [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight];
    wrap('shaderSource', args => {
      if (armed) fail('Shader mutation during capture unsupported');
      const id = objectId(args[0], shaderIds, shaders, id => ({ id, kind: null, source: null }));
      if (id === null) return;
      const text = String(args[1]); sourceBytes += text.length * 2;
      if (sourceBytes > limits.shaderBytes || shaders.length > limits.shaders) { fail('Shader capture cap exceeded'); return; }
      shaders[id - 1].source = text;
    });
    const createShader = gl.createShader;
    gl.createShader = function (kind) { const object = Reflect.apply(createShader, gl, [kind]); if (object) { const id = objectId(object, shaderIds, shaders, id => ({ id, kind, source: null })); if (id !== null) shaders[id - 1].kind = kind; } return object; };
    wrap('attachShader', args => {
      if (armed) fail('Shader attachment mutation during capture unsupported');
      const id = programId(args[0]);
      if (id === null) return;
      if (programs.length > limits.programs) { fail('Program capture cap exceeded'); return; }
      const attached = programs[id - 1].shaderIds, shaderId = shaderIds.get(args[1]);
      if (!attached.includes(shaderId)) {
        if (attached.length >= 16) { fail('Program attachment metadata cap exceeded'); return; }
        attached.push(shaderId);
      }
    });
    wrap('detachShader', () => { if (armed) fail('Shader detachment mutation during capture unsupported'); });
    const linkProgram = gl.linkProgram;
    gl.linkProgram = function (object) {
      if (armed) fail('Program relink during capture unsupported');
      const returned = Reflect.apply(linkProgram, gl, [object]);
      const id = programId(object);
      if (id !== null && gl.getProgramParameter(object, gl.LINK_STATUS)) {
        const row = programs[id - 1];
        if (row.links.length >= 16) { fail('Linked program generation cap exceeded'); return returned; }
        const attached = gl.getAttachedShaders(object) || [];
        if (attached.length > 16) { fail('Linked shader attachment cap exceeded'); return returned; }
        const linkedShaders = attached.map(shader => ({ shaderId: shaderIds.get(shader), kind: gl.getShaderParameter(shader, gl.SHADER_TYPE), source: gl.getShaderSource(shader) }));
        sourceBytes += linkedShaders.reduce((sum, shader) => sum + (shader.source?.length || 0) * 2, 0);
        if (sourceBytes > limits.shaderBytes) { fail('Linked shader source cap exceeded'); return returned; }
        row.activeGeneration = row.links.length + 1;
        row.links.push({ generation: row.activeGeneration, linkedShaders });
      }
      return returned;
    };
    wrap('useProgram', args => { program = programId(args[0]); });
    wrap('viewport', args => { viewport = args.slice(0, 4); });
    wrap('activeTexture', args => { unit = args[0] - gl.TEXTURE0; if (unit < 0 || unit >= limits.textureUnits) fail('Texture unit metadata cap exceeded'); });
    wrap('bindTexture', args => { const key = `${unit}:${args[0]}`; if (!bindings.has(key) && bindings.size >= 256) { fail('Texture binding metadata cap exceeded'); return; } if (unit >= 0 && unit < limits.textureUnits) bindings.set(key, textureId(args[1])); });
    wrap('texImage2D', args => allocation(args, 'image2'));
    wrap('texImage3D', args => allocation(args, 'image3'));
    wrap('texStorage2D', args => allocation(args, 'storage2'));
    wrap('texStorage3D', args => allocation(args, 'storage3'));
    wrap('bindFramebuffer', args => {
      const id = framebufferId(args[1]);
      if (args[0] !== gl.READ_FRAMEBUFFER) drawFramebuffer = id;
      if (args[0] !== gl.DRAW_FRAMEBUFFER) readFramebuffer = id;
    });
    wrap('framebufferTexture2D', args => attach(args, 'texture'));
    wrap('framebufferTextureLayer', args => attach(args, 'layer'));
    wrap('framebufferRenderbuffer', args => attach(args, 'renderbuffer'));
    wrap('bindRenderbuffer', args => { renderbuffer = renderbufferId(args[1]); });
    wrap('renderbufferStorage', args => { if (renderbuffer) Object.assign(renderbuffers[renderbuffer - 1], { width: args[2], height: args[3], samples: 0 }); });
    wrap('renderbufferStorageMultisample', args => { if (renderbuffer) Object.assign(renderbuffers[renderbuffer - 1], { width: args[3], height: args[4], samples: args[1] }); });
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'clear', 'blitFramebuffer']) {
      const original = gl[name];
      if (typeof original !== 'function') continue;
      gl[name] = function (...args) {
        if (!armed) return Reflect.apply(original, gl, args);
        if (name.startsWith('draw') && (program === null || programs[program - 1].activeGeneration === null)) { fail('Draw has no captured successful linked executable'); return Reflect.apply(original, gl, args); }
        if (records.length >= limits.operations) { fail('Operation/query cap exceeded'); return Reflect.apply(original, gl, args); }
        const query = gl.createQuery();
        if (!query) { fail('Actual timer query allocation failed'); return Reflect.apply(original, gl, args); }
        const record = { ordinal: records.length, timestamp: stamp, operation: name, args,
          programId: name.startsWith('draw') ? program : null, programGeneration: name.startsWith('draw') ? programs[program - 1].activeGeneration : null, viewport: viewport.slice(),
          drawFramebuffer: attachmentSnapshot(drawFramebuffer), readFramebuffer: name === 'blitFramebuffer' ? attachmentSnapshot(readFramebuffer) : null,
          textures: [...bindings.entries()].filter(([, id]) => id !== null).map(([binding, id]) => ({ binding, ...textures[id - 1] })),
          submitCpuMs: null, gpuElapsedNs: null, query, available: false };
        records.push(record);
        gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
        const started = performance.now();
        try { return Reflect.apply(original, gl, args); }
        finally { record.submitCpuMs = performance.now() - started; gl.endQuery(extension.TIME_ELAPSED_EXT); }
      };
    }
  }
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const context = Reflect.apply(getContext, this, args);
    if (!gl && context && this.getAttribute('data-testid') === 'world-canvas' && String(args[0]).includes('webgl')) install(context);
    return context;
  };
  const api = {
    capability() {
      const webgl2 = typeof WebGL2RenderingContext === 'function' && gl instanceof WebGL2RenderingContext;
      if (!webgl2) return { supported: false, reason: 'Actual root WebGL2 required', method: 'timer-query', errors };
      extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const supported = !!extension && ['createQuery', 'beginQuery', 'endQuery', 'getQueryParameter', 'deleteQuery'].every(name => typeof gl[name] === 'function');
      const disjoint = extension ? !!gl.getParameter(extension.GPU_DISJOINT_EXT) : null;
      return { supported: supported && !disjoint && errors.length === 0, reason: !supported ? 'Actual EXT_disjoint_timer_query_webgl2 unavailable' : disjoint ? 'Actual GPU disjoint at capability boundary' : errors.length ? 'Passive metadata capture failed' : null,
        method: 'timer-query', extension: !!extension, disjoint, version: gl.getParameter(gl.VERSION), supportedExtensions: gl.getSupportedExtensions(), errors, limits };
    },
    start() { if (!extension || armed || records.length) throw Error('One supported timer-query capture only'); armed = true; },
    drain() {
      if (!captureDone) return { complete: false, pending: records.length, errors };
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) { fail('Actual GPU disjoint; all timer samples invalid'); return { complete: false, disjoint: true, errors }; }
      for (const row of records) if (!row.available && gl.getQueryParameter(row.query, gl.QUERY_RESULT_AVAILABLE)) {
        row.gpuElapsedNs = Number(gl.getQueryParameter(row.query, gl.QUERY_RESULT)); row.available = true;
        gl.deleteQuery(row.query); row.query = null;
        if (!Number.isFinite(row.gpuElapsedNs) || row.gpuElapsedNs < 0) fail('Invalid actual timer duration');
      }
      const disjoint = !!gl.getParameter(extension.GPU_DISJOINT_EXT);
      if (disjoint) fail('Actual GPU disjoint after final query reads; all samples invalid');
      return { complete: !disjoint && records.every(row => row.available), pending: records.filter(row => !row.available).length, disjoint, errors };
    },
    result() { const disjoint = extension ? !!gl.getParameter(extension.GPU_DISJOINT_EXT) : null; if (disjoint) fail('Actual GPU disjoint at final result boundary'); return { method: 'timer-query', disjoint, captureDone, records: records.map(record => { const row = { ...record }; delete row.query; return row; }), shaders, programs, errors,
      sourceBytes, limits, glError: gl ? gl.getError() : null, textureDimensions: textures, framebufferAttachments: framebuffers, renderbufferDimensions: renderbuffers }; },
  };
  Object.defineProperty(window, '__programAttribution', { value: api });
}
