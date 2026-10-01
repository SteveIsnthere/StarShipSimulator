// Wall 1: core/ must not import from view/, ui/, hud/, app/, PIXI or Svelte.
import { Application } from 'pixi.js';
import { camera } from '$view/camera';
import { binder } from '../../hud/binder';

export function draw(): void {
  void Application;
  void camera;
  void binder;
}
