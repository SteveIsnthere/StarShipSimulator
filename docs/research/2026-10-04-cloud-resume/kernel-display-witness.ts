/** Research-only public SDK classification. Never invoke a drawing method. */
import { Container, Graphics, Mesh, Rectangle, Sprite, Texture, TextureSource, TilingSprite } from 'pixi.js';

function reject(node: Container, value: unknown, reason: string): never {
  const valueKind = value === null ? 'null' : typeof value;
  throw Error(`Display witness:${reason}; class=${node.constructor.name}; label=${node.label}; textureKind=${valueKind}`);
}

function rectangle(value: unknown, node: Container) {
  if (!(value instanceof Rectangle)) reject(node, value, 'Expected public Rectangle');
  const fields = { x: value.x, y: value.y, width: value.width, height: value.height };
  if (!Object.values(fields).every(Number.isFinite)) reject(node, value, 'Nonfinite texture rectangle');
  return fields;
}

function textureFields(value: unknown, node: Container) {
  if (!(value instanceof Texture)) reject(node, value, 'Expected public Texture');
  const source: unknown = value.source;
  if (!(source instanceof TextureSource)) reject(node, source, 'Expected public TextureSource');
  if (!Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width < 0 || source.height < 0) {
    reject(node, source, 'Invalid public TextureSource dimensions');
  }
  return { frame: rectangle(value.frame, node), orig: rectangle(value.orig, node),
    // Texture constructor leaves its optional trim undefined when untrimmed.
    trim: value.trim === null || value.trim === undefined ? null : rectangle(value.trim, node),
    sourceWidth: source.width, sourceHeight: source.height };
}

export function classifyPublicDisplay(node: Container) {
  if (!(node instanceof Container)) throw Error('Public Container required');
  if (node instanceof Graphics) {
    if (node.texture !== Graphics.prototype.texture) reject(node, node.texture, 'Unrecognized Graphics drawing method');
    return { displayClass: 'Graphics', anchor: null, texture: null, textureRole: 'public-drawing-method' };
  }
  if (node instanceof Sprite || node instanceof TilingSprite) {
    const anchor = { x: node.anchor.x, y: node.anchor.y };
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) reject(node, node.texture, 'Invalid public anchor');
    return { displayClass: node instanceof Sprite ? 'Sprite' : 'TilingSprite', anchor,
      texture: textureFields(node.texture, node), textureRole: 'public-texture' };
  }
  if (node instanceof Mesh) {
    // Pinned constructor/setter substitute actual WHITE/EMPTY textures.
    // The nullable API comment does not establish a supported null path.
    return { displayClass: 'Mesh', anchor: null, texture: textureFields(node.texture, node), textureRole: 'public-texture' };
  }
  if ('texture' in node) reject(node, (node as Container & { texture: unknown }).texture, 'Unknown texture-bearing public class');
  if ('anchor' in node) reject(node, (node as Container & { anchor: unknown }).anchor, 'Unknown anchor-bearing public class');
  return { displayClass: 'Container', anchor: null, texture: null, textureRole: 'no-public-texture' };
}
