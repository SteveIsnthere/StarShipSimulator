// Wall 1: core/ must not import from view/, ui/, hud/, app/, PIXI or a UI framework.
import { Application } from 'pixi.js';
import { useState } from 'react';
import { Button } from '@ui/Button';
import { camera } from '$view/camera';
import { binder } from '../../hud/binder';

export function draw(): void {
  void Application;
  void camera;
  void binder;
  void useState;
  void Button;
}
