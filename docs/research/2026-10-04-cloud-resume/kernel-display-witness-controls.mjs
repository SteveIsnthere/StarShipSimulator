/** Pure actual locked SDK controls. No canvas, renderer, browser or GL calls. */
import assert from 'node:assert/strict';
import { Container, Graphics, Mesh, MeshGeometry, Sprite, Texture, TextureSource, TilingSprite } from 'pixi.js';
import { classifyPublicDisplay } from './kernel-display-witness.ts';

const source = new TextureSource({ width: 7, height: 9 });
const texture = new Texture({ source });
const owned = [new Container(), new Graphics(), new Sprite(texture),
  new TilingSprite({ texture, width: 11, height: 13 }), new Mesh({ geometry: new MeshGeometry(), texture })];
const extraTextures = [], restore = [];
try {
  const witnesses = owned.map(classifyPublicDisplay);
  assert.deepEqual(witnesses.map(value => value.displayClass), ['Container', 'Graphics', 'Sprite', 'TilingSprite', 'Mesh']);
  assert.equal(witnesses[1].textureRole, 'public-drawing-method');
  assert.equal(witnesses[1].texture, null);
  for (const index of [2, 3, 4]) {
    assert.deepEqual(witnesses[index].texture, { frame: { x: 0, y: 0, width: 7, height: 9 },
      orig: { x: 0, y: 0, width: 7, height: 9 }, trim: null, sourceWidth: 7, sourceHeight: 9 });
  }
  const unknown = new Container({ label: 'unknown-texture-control' });
  owned.push(unknown);
  Object.defineProperty(unknown, 'texture', { value: texture });
  assert.throws(() => classifyPublicDisplay(unknown), /Unknown texture-bearing.*class=Container.*label=unknown-texture-control/);
  const malformed = new Sprite(texture);
  owned.push(malformed);
  Object.defineProperty(malformed, 'texture', { value: { source: { width: 7, height: 9 } } });
  assert.throws(() => classifyPublicDisplay(malformed), /Expected public Texture.*textureKind=object/);
  const malformedSource = new Texture({ source });
  extraTextures.push(malformedSource);
  Object.defineProperty(malformedSource, 'source', { value: { width: 7, height: 9 }, configurable: true });
  restore.push(() => Reflect.deleteProperty(malformedSource, 'source'));
  const badSourceSprite = new Sprite(texture);
  owned.push(badSourceSprite);
  Object.defineProperty(badSourceSprite, 'texture', { value: malformedSource });
  assert.throws(() => classifyPublicDisplay(badSourceSprite), /Expected public TextureSource/);
  const methodUnknown = new Container({ label: 'unknown-method-control' });
  owned.push(methodUnknown);
  Object.defineProperty(methodUnknown, 'texture', { value() { throw Error('Must never be invoked'); } });
  assert.throws(() => classifyPublicDisplay(methodUnknown), /Unknown texture-bearing.*textureKind=function/);
  const replacedGraphics = new Graphics({ label: 'replaced-method-control' });
  owned.push(replacedGraphics);
  Object.defineProperty(replacedGraphics, 'texture', { value() { throw Error('Must never be invoked'); } });
  assert.throws(() => classifyPublicDisplay(replacedGraphics), /Unrecognized Graphics drawing method.*class=Graphics.*textureKind=function/);
  const unknownAnchor = new Container({ label: 'unknown-anchor-control' });
  owned.push(unknownAnchor);
  Object.defineProperty(unknownAnchor, 'anchor', { value: { x: 0, y: 0 } });
  assert.throws(() => classifyPublicDisplay(unknownAnchor), /Unknown anchor-bearing.*textureKind=object/);
  const width = source.width;
  source.width = Infinity;
  try { assert.throws(() => classifyPublicDisplay(owned[2]), /Invalid public TextureSource dimensions/); }
  finally { source.width = width; }
  const badRectangle = new Texture({ source });
  extraTextures.push(badRectangle);
  const frame = badRectangle.frame;
  badRectangle.frame = { x: 0, y: 0, width: 7, height: 9 };
  const badRectangleSprite = new Sprite(texture);
  owned.push(badRectangleSprite);
  Object.defineProperty(badRectangleSprite, 'texture', { value: badRectangle });
  try { assert.throws(() => classifyPublicDisplay(badRectangleSprite), /Expected public Rectangle/); }
  finally { badRectangle.frame = frame; }
  frame.width = NaN;
  try { assert.throws(() => classifyPublicDisplay(badRectangleSprite), /Nonfinite texture rectangle/); }
  finally { frame.width = 7; }
  const nonfiniteAnchor = new Sprite(texture);
  owned.push(nonfiniteAnchor);
  nonfiniteAnchor.anchor.x = Infinity;
  assert.throws(() => classifyPublicDisplay(nonfiniteAnchor), /Invalid public anchor/);
  for (const shader of [null, undefined, {}]) {
    const nullMesh = new Mesh({ geometry: new MeshGeometry(), texture });
    owned.push(nullMesh);
    Object.defineProperty(nullMesh, 'texture', { value: null });
    Object.defineProperty(nullMesh, 'shader', { value: shader });
    assert.throws(() => classifyPublicDisplay(nullMesh), /Expected public Texture.*textureKind=null/);
  }
  console.log(JSON.stringify({ passed: true, actualSdk: true, gpuCalls: 0,
    positives: witnesses, negatives: ['unknown texture-bearing Container', 'malformed Sprite texture', 'malformed TextureSource',
      'unknown drawing method', 'replaced Graphics drawing method', 'unknown anchor', 'nonfinite TextureSource dimensions',
      'malformed Rectangle', 'nonfinite Rectangle', 'nonfinite public anchor', 'null Mesh texture with null/undefined/arbitrary shader'] }));
} finally {
  for (const reset of restore) reset();
  for (const node of owned) node.destroy();
  for (const extra of extraTextures) extra.destroy();
  texture.destroy(true);
}
