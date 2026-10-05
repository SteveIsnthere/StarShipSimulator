import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DOMAdapter } from 'pixi.js';
import { createVehicleGeometry } from '$view/vehicle-geometry';
import { createComponentVehicle } from '$view/component-vehicle';
import { createCamera, computeViewport } from '$view/camera';
import { createSunLight, lightInVehicleFrame, writeSun } from '$view/sun';
import { tileGlow } from '$view/heat-look';

describe('startup V3 component renderer', () => {
  beforeAll(() => vi.spyOn(DOMAdapter.get(), 'createCanvas').mockReturnValue({
    getContext: () => null,
  } as unknown as HTMLCanvasElement));
  afterAll(() => vi.restoreAllMocks());

  it('keeps articulation at its physical pivot without translating the root', () => {
    const geometry = createVehicleGeometry({ id: 'ship', height: 52, diameter: 9 });
    const view = createComponentVehicle(geometry);
    const part = view.partsById.get('ship-aft-flap-right')!;
    const x = part.container.x, y = part.container.y;
    view.setArticulation(part.component.id, 0.4, 0.55);
    expect(part.container.x).toBe(x); expect(part.container.y).toBe(y);
    expect(part.container.rotation).toBe(0.4); expect(part.container.scale.x).toBe(0.55);
    expect(x).toBe(part.component.x);
    expect(y).toBe(geometry.height / 2 - part.component.station);
    const mesh = part.meshes[0]!;
    const root = part.component.polygons[0]!.points[0]!;
    expect(mesh.geometry.positions[0]! + x).toBeCloseTo(root.x);
    expect(mesh.geometry.positions[1]! + y).toBeCloseTo(geometry.height / 2 - root.station);
    view.destroy();
  });

  it('removes one physical component independently and restores it only when explicitly told', () => {
    const geometry = createVehicleGeometry({ id: 'super-heavy', height: 72, diameter: 9 });
    const view = createComponentVehicle(geometry);
    view.setComponentState('booster-grid-1', false, 1000);
    expect(view.partsById.get('booster-grid-1')!.container.visible).toBe(false);
    expect(view.partsById.get('booster-grid-0')!.container.visible).toBe(true);
    const viewport = computeViewport(800, 600, 72), camera = createCamera(viewport, 0, 0, 0);
    view.updatePose(camera, viewport, { altitude: 500, downRangeDistance: 0, pitch: 0 });
    expect(view.partsById.get('booster-grid-1')!.container.visible).toBe(false);
    view.setComponentState('booster-grid-1', true, 300);
    expect(view.partsById.get('booster-grid-1')!.container.visible).toBe(true);
    view.destroy();
  });

  it('gives main/inset and individual parts independent light and temperature uniforms while sharing the program', () => {
    const geometry = createVehicleGeometry({ id: 'ship', height: 52, diameter: 9 });
    const main = createComponentVehicle(geometry), inset = createComponentVehicle(geometry);
    const a = main.partsById.get('ship-hull-forward')!.materials[0]!;
    const b = main.partsById.get('ship-hull-aft')!.materials[0]!;
    const c = inset.partsById.get('ship-hull-forward')!.materials[0]!;
    expect(a.shader.glProgram).toBe(c.shader.glProgram);
    expect(a.uniforms.uLight).not.toBe(c.uniforms.uLight);
    main.setComponentState('ship-hull-forward', true, 1100);
    expect(a.uniforms.uGlow).toBe(tileGlow(1100));
    expect(b.uniforms.uGlow).toBe(0); expect(c.uniforms.uGlow).toBe(0);
    const viewport = computeViewport(800, 600, 52), camera = createCamera(viewport, 0, 0, 0);
    const sun = createSunLight(); writeSun(sun, 'custom', 0, 0, 9.5);
    main.updatePose(camera, viewport, { altitude: 500, downRangeDistance: 0, pitch: 0.3 }, sun);
    const expected = { x: 0, y: 0, z: 0 }; lightInVehicleFrame(sun, 0.3, expected);
    expect(a.uniforms.uLight[0]).toBeCloseTo(expected.x);
    expect(a.uniforms.uLight[1]).toBeCloseTo(expected.y);
    expect(a.uniforms.uLight[2]).toBeCloseTo(expected.z);
    expect(c.uniforms.uLight[0]).not.toBeCloseTo(expected.x);
    expect(a.uniforms.uEnvironmentUp[0]).toBeCloseTo(-Math.sin(0.3));
    expect(a.uniforms.uEnvironmentUp[1]).toBeCloseTo(-Math.cos(0.3));
    expect(a.uniforms.uEnvironmentUp).not.toBe(c.uniforms.uEnvironmentUp);
    const flap = main.partsById.get('ship-front-flap-right')!;
    main.setArticulation(flap.component.id, 0.4);
    expect(flap.materials[0]!.uniforms.uEnvironmentUp[0]).toBeCloseTo(-Math.sin(0.7));
    main.destroy(); inset.destroy();
  });

  it('triangulates concave scalloped grids without triangles spanning their notches', () => {
    const geometry = createVehicleGeometry({ id: 'super-heavy', height: 72, diameter: 9 });
    const view = createComponentVehicle(geometry);
    const part = view.partsById.get('booster-grid-2')!, mesh = part.meshes[0]!;
    view.setArticulation(part.component.id, Math.PI / 2);
    const vertices = mesh.geometry.positions, indices = mesh.geometry.indices;
    let area = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i]! * 2, b = indices[i + 1]! * 2, c = indices[i + 2]! * 2;
      area += Math.abs((vertices[b]! - vertices[a]!) * (vertices[c + 1]! - vertices[a + 1]!)
        - (vertices[b + 1]! - vertices[a + 1]!) * (vertices[c]! - vertices[a]!)) / 2;
    }
    const polygon = part.component.polygons[0]!.points;
    const expected = Math.abs(polygon.reduce((sum, p, i) => {
      const q = polygon[(i + 1) % polygon.length]!;
      return sum + p.x * q.station - q.x * p.station;
    }, 0)) / 2;
    expect(area).toBeCloseTo(expected, 4);
    expect(indices.length / 3).toBe(polygon.length - 2);
    view.destroy();
  });

  it('projects a radial grid hinge rather than rotating its face in the drawing plane, retaining its buffers on detachment', () => {
    const view = createComponentVehicle(createVehicleGeometry({ id: 'super-heavy', height: 72, diameter: 9 }));
    const part = view.partsById.get('booster-grid-0')!, mesh = part.meshes[0]!;
    const positions = mesh.geometry.positions;
    view.setArticulation(part.component.id, 0);
    const neutral = Array.from(positions);
    expect(Math.max(...neutral.filter((_, i) => i % 2)) - Math.min(...neutral.filter((_, i) => i % 2))).toBeCloseTo(0);
    view.setArticulation(part.component.id, Math.PI / 4);
    expect(part.container.rotation).toBe(0);
    const projected = Array.from(positions);
    expect(Math.max(...projected.filter((_, i) => i % 2)) - Math.min(...projected.filter((_, i) => i % 2)))
      .toBeCloseTo(9 * .36 / Math.sqrt(2));
    expect(projected).not.toEqual(neutral);
    const viewport = computeViewport(800, 600, 72), camera = createCamera(viewport, 0, 0, 0);
    view.updatePose(camera, viewport, { altitude: 200, downRangeDistance: 30, pitch: .2 });
    const vertexBefore = part.container.toGlobal({ x: projected[0]!, y: projected[1]! });
    const centroid = part.container.toGlobal({ x: 1.2, y: -.3 });
    view.setDetachedPose(part.component.id, { altitude: camera.posY + (300 - centroid.y) / viewport.scale,
      downRangeDistance: camera.posX + (centroid.x - 400) / viewport.scale,
      pitch: .2, pivotToCentroidX: 1.2, pivotToCentroidY: -.3 });
    view.setArticulation(part.component.id, -.4);
    expect(mesh.geometry.positions).toBe(positions);
    expect(Array.from(positions)).toEqual(projected);
    const vertexAfter = part.container.toGlobal({ x: positions[0]!, y: positions[1]! });
    expect(vertexAfter.x).toBeCloseTo(vertexBefore.x); expect(vertexAfter.y).toBeCloseTo(vertexBefore.y);
    view.destroy();
  });

  it('orders overlapping engine bells by real authored depth and the rim last, without moving their support identity', () => {
    const geometry = createVehicleGeometry({ id: 'super-heavy', height: 72, diameter: 9 });
    const view = createComponentVehicle(geometry), part = view.partsById.get('booster-engine-support')!;
    const ordered = part.meshes.map(m => part.component.polygons.find(p => p.id === m.label)!);
    expect(ordered.map(p => p.depth)).toEqual(ordered.map(p => p.depth).sort((a, b) => a - b));
    expect(ordered.at(-1)!.surfaceRole).toBe('engine-rim');
    expect(ordered.filter(p => p.surfaceRole === 'bell-mouth')).toHaveLength(33);
    for (let i = 0; i < ordered.length; i++) if (ordered[i]!.surfaceRole === 'bell-shell') {
      const material = part.materials[i]!;
      expect(material.uniforms.uNormalMode).toBe(3);
      expect(material.uniforms.uBounds[2]! - material.uniforms.uBounds[0]!).toBeCloseTo(1.3);
    }
    expect(part.meshes.find(m => m.label.includes('bell-mouth'))!.tint).not.toBe(0xffffff);
    view.setComponentState('booster-engine-support', false, 300);
    expect(part.container.visible).toBe(false);
    expect(view.partsById.get('booster-hull-aft')!.container.visible).toBe(true);
    view.destroy();
  });

  it('keeps startup containers, buffers and uniform arrays through pose, scale, damage and LOD changes', () => {
    const geometry = createVehicleGeometry({ id: 'ship', height: 52, diameter: 9 });
    const view = createComponentVehicle(geometry), viewport = computeViewport(800, 600, 52);
    const camera = createCamera(viewport, 0, 0, 0);
    const parts = [...view.partsById.values()];
    const buffers = parts.flatMap(p => p.meshes.map(m => m.geometry.positions));
    const lights = parts.flatMap(p => p.materials.map(m => m.uniforms.uLight));
    const children = view.container.children.slice();
    const pose = { altitude: 0, downRangeDistance: 0, pitch: 0 };
    for (let i = 0; i < 30; i++) {
      pose.altitude = i; pose.pitch = i / 20;
      view.updatePose(camera, viewport, pose);
      view.setComponentState('ship-aft-flap-left', i % 2 === 0, 300 + i * 20);
      view.setArticulation('ship-front-flap-left', i / 50, 0.5);
      view.setDetail(i % 2 === 0);
    }
    expect(view.container.children).toEqual(children);
    expect([...view.partsById.values()]).toEqual(parts);
    const afterBuffers = parts.flatMap(p => p.meshes.map(m => m.geometry.positions));
    const afterLights = parts.flatMap(p => p.materials.map(m => m.uniforms.uLight));
    for (let i = 0; i < buffers.length; i++) expect(afterBuffers[i]).toBe(buffers[i]);
    for (let i = 0; i < lights.length; i++) expect(afterLights[i]).toBe(lights[i]);
    for (const p of parts) for (const material of p.materials) {
      expect(Number.isFinite(material.uniforms.uPixelsPerMetre)).toBe(true);
      expect(material.uniforms.uDetail).toBe(0);
    }
    view.destroy();
  });

  it('relocates existing geometry about an explicit physical centroid, including rotated offsets', () => {
    const view = createComponentVehicle(createVehicleGeometry({ id: 'ship', height: 52, diameter: 9 }));
    const part = view.partsById.get('ship-front-flap-right')!;
    const meshes = part.meshes.slice(), buffer = meshes[0]!.geometry.positions;
    const viewport = computeViewport(800, 600, 52), camera = createCamera(viewport, 0, 0, 0);
    camera.posX = 100; camera.posY = 200;
    const pose = { altitude: 250, downRangeDistance: 120, pitch: 0.8,
      pivotToCentroidX: 1.3, pivotToCentroidY: -0.4 };
    view.updatePose(camera, viewport, { altitude: 300, downRangeDistance: 100, pitch: 0.2 });
    const slots = view.debrisContainer.children.slice();
    expect(slots).toHaveLength(8);
    expect(slots.every(slot => slot.children.length === 0)).toBe(true);
    view.setDetachedPose(part.component.id, pose);
    expect(part.container.parent).not.toBe(view.container);
    expect(part.container.parent!.parent).toBe(view.debrisContainer);
    expect(part.meshes).toEqual(meshes); expect(meshes[0]!.geometry.positions).toBe(buffer);
    const centroid = part.container.toGlobal({ x: pose.pivotToCentroidX, y: pose.pivotToCentroidY });
    expect(centroid.x).toBeCloseTo(400 + (120 - camera.posX - camera.shakeX) * viewport.scale);
    expect(centroid.y).toBeCloseTo(300 - (250 - camera.posY - camera.shakeY) * viewport.scale);
    view.updatePose(camera, viewport, { altitude: 400, downRangeDistance: 500, pitch: -1 });
    view.setArticulation(part.component.id, -0.6, 0.2);
    view.setComponentState(part.component.id, false, 800);
    expect(part.container.rotation).toBe(0);
    expect(part.container.visible).toBe(true);
    const after = part.container.toGlobal({ x: pose.pivotToCentroidX, y: pose.pivotToCentroidY });
    expect(after.x).toBeCloseTo(centroid.x); expect(after.y).toBeCloseTo(centroid.y);
    expect(view.debrisContainer.children).toEqual(slots);
    view.destroy();
  });

  it('reattaches and resets all retained parts without leaving duplicate or missing geometry', () => {
    const view = createComponentVehicle(createVehicleGeometry({ id: 'super-heavy', height: 72, diameter: 9 }));
    const part = view.partsById.get('booster-grid-1')!;
    const children = view.container.children.slice(), x = part.container.x, y = part.container.y;
    view.setArticulation(part.component.id, 0.4, 0.7);
    const pose = { altitude: 200, downRangeDistance: 20, pitch: 1,
      pivotToCentroidX: -1, pivotToCentroidY: 0 };
    view.setDetachedPose(part.component.id, pose);
    view.setDetachedPose(part.component.id, null);
    expect(view.container.children).toEqual(children);
    expect(part.container.x).toBe(x); expect(part.container.y).toBe(y);
    expect(part.container.rotation).toBe(0); expect(part.container.scale.x).toBe(1);
    view.setDetachedPose('booster-engine-support', pose);
    view.setComponentState('booster-hull-aft', false, 1000);
    view.reset();
    expect(view.container.children).toEqual(children);
    expect([...view.partsById.values()].every(p => p.container.visible && p.container.rotation === 0 && p.container.scale.x === 1)).toBe(true);
    expect(view.debrisContainer.children.every(slot => slot.children.length === 0)).toBe(true);
    const destroy = vi.spyOn(part.meshes[0]!.geometry, 'destroy');
    view.setDetachedPose(part.component.id, pose);
    view.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
