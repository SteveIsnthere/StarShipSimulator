import { Application, Mesh, MeshGeometry, Texture } from 'pixi.js';
import { writeHullLighting, createVehicleLighting } from '../../../src/view/lighting';

/** Real production lighting shader with an unambiguously grey cylinder source. */
export async function heatShieldWitness(realAsset = false) {
  const app = new Application();
  await app.init({ width: 320, height: 480, background: 0x101010,
    resolution: 2, preference: 'webgl', autoStart: false });
  const source = document.createElement('canvas');
  source.width = 100; source.height = 500;
  const context = source.getContext('2d')!;
  context.fillStyle = '#b4b4b4'; context.fillRect(0, 0, 100, 500);
  if (realAsset) {
    const image = new Image(); image.src = '/assets/Starship.webp'; await image.decode();
    source.width = image.naturalWidth; source.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
  }
  const original = context.getImageData(0, 0, source.width, source.height).data;
  const normals = new Uint8ClampedArray(original.length);
  writeHullLighting(original, source.width, source.height, normals);
  const texture = Texture.from(source);
  const lighting = createVehicleLighting(texture);
  if (!lighting) throw new Error('production lighting did not create its shader');
  const geometry = new MeshGeometry({ positions: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) });
  const mesh = new Mesh({ geometry, shader: lighting.shader });
  mesh.position.set(160, 240); mesh.scale.set(60, 160);
  app.stage.addChild(mesh);
  const read = async (lightX: number, daylight: number) => {
    lighting.set(lightX, 0, 0.3, daylight);
    app.render();
    const capture = app.canvas.toDataURL();
    const image = new Image(); image.src = capture; await image.decode();
    const copy = document.createElement('canvas'); copy.width = 640; copy.height = 960;
    const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, 640, 960).data;
    let left = 0, right = 0, count = 0;
    let leftCount = 0, rightCount = 0;
    if (realAsset) {
      for (let y = 320; y < 512; y++) for (let x = 200; x < 440; x++) {
        const tx = Math.floor((x - 200) / 240 * source.width);
        const ty = Math.floor((y - 160) / 640 * source.height);
        const i = (ty * source.width + tx) * 4;
        const nx = normals[i]! / 255 * 2 - 1;
        const nz = normals[i + 2]! / 255 * 2 - 1;
        if (original[i + 3]! < 240 || nz < 0.65 || Math.abs(nx) < 0.3 || Math.abs(nx) > 0.7) continue;
        const value = pixels[(y * 640 + x) * 4]!;
        if (nx < 0) { left += value; leftCount++; }
        else { right += value; rightCount++; }
      }
      if (!leftCount || !rightCount) throw new Error("real asset hull detector found no opposite faces");
    } else for (let y = 320; y < 640; y++) for (let x = 220; x < 260; x++) {
      left += pixels[(y * 640 + x) * 4]!;
      right += pixels[(y * 640 + (640 - x)) * 4]!;
      count++;
    }
    return { left: left / (realAsset ? leftCount : count), right: right / (realAsset ? rightCount : count), capture };
  };
  const day = await read(1, 1);
  const reversed = await read(-1, 1);
  const night = await read(1, 0);
  // Same normals, roughness, light, exposure and geometry. Replace only the
  // generated material with original stainless albedo for a causal control.
  lighting.shader.resources['uTexture'] = texture.source;
  lighting.shader.resources['uSampler'] = texture.source.style;
  const unshielded = await read(1, 1);
  lighting.destroy(); geometry.destroy(true); mesh.destroy(); texture.destroy(true); app.destroy(true);
  return { day, reversed, night, unshielded };
}
