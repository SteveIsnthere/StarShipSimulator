/**
 * The camera's per-step follow: the simulation state the camera reads, copied
 * into one object allocated at creation, so the per-step path allocates
 * nothing (sim-core-conventions), and the follow options the session switches
 * (the cinematic camera mode).
 */
import { DT } from '$app/loop';
import { starBaseXPos } from '$core/constants';
import type { SimState } from '$core/state';
import type { MissionState } from '$core/mission';
import { SHIP, type VehicleDefinition } from '$core/vehicle';
import { SUPER_HEAVY } from '$core/vehicles/super-heavy';
import { damageModelFor } from '$core/physics/damage-model';
import type { ViewApp } from '$view/app';
import { updateCamera, type CameraMode, type MutableViewport } from '$view/camera';
import { SHIP_VISUAL_DIAMETER } from '$view/vehicle';

export type CameraFollowView = Pick<ViewApp, 'viewport' | 'camera' | 'followAltitude'>;

export interface CameraFollow {
  /** Move the camera one simulation step toward the vehicle. */
  step(view: CameraFollowView, state: SimState, mission?: MissionState, model?: VehicleDefinition): void;
  reset(view: CameraFollowView, state: SimState, mission?: MissionState, model?: VehicleDefinition): void;
  select(view: CameraFollowView, state: SimState, model?: VehicleDefinition): void;
  /** The framing in effect: follow, or the cinematic mode chosen. */
  setMode(mode: CameraMode): void;
}

export function createCameraFollow(): CameraFollow {
  let pairFraming = true;
  let terminalPieces = false;
  const fitted: MutableViewport = { width: 0, height: 0, physicalWidth: 0, physicalHeight: 0, scale: 0 };
  const shipBounds = { left: 0, right: 0, bottom: 0, top: 0 };
  const boosterBounds = { ...shipBounds };
  const bounds = { ...shipBounds };
  const target = {
    downRangeDistance: 0,
    altitude: 0,
    speedX: 0,
    speedY: 0,
    landed: false,
    onTheGround: false,
    crashed: false,
    dynamicPressure: 0,
    thrustAcceleration: 0,
  };
  const options: { reducedMotion: boolean; mode: CameraMode; padX: number } = {
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    mode: 'follow',
    padX: starBaseXPos,
  };
  function read(state: SimState, model: VehicleDefinition) {
    target.downRangeDistance = state.kinematics.downRangeDistance;
    target.altitude = state.kinematics.altitude;
    target.speedX = state.kinematics.speedX;
    target.speedY = state.kinematics.speedY;
    // Camera ground-stop signal, not the physical landed/caught verdict.
    target.landed = state.status.landed && state.status.onTheGround;
    target.onTheGround = state.status.onTheGround;
    target.crashed = state.failures.crashed;
    target.dynamicPressure = state.forces.dynamicPressure;
    target.thrustAcceleration = state.forces.thrustAcceleration;
    terminalPieces = false;
    const damage = state.damage;
    if (!damage?.terminal.active) return;
    // Catalogue already exists when the physical state is constructed. Follow
    // actual dry-piece centroids, never the terminal snapshot/frozen hull or
    // the released propellant ledger. No simulation field is written here.
    const source = damageModelFor(model);
    let mass = 0, x = 0, y = 0, vx = 0, vy = 0, grounded = true;
    bounds.left = bounds.bottom = Infinity; bounds.right = bounds.top = -Infinity;
    for (let i = 0; i < damage.debris.length; i++) {
      const piece = damage.debris[i]!;
      if (!piece.active) continue;
      const m = source.partition.components[i]!.mass, radius = source.debris.pieces[i]!.supportRadius;
      mass += m; x += m * piece.x; y += m * piece.altitude;
      vx += m * piece.speedX; vy += m * piece.speedY;
      bounds.left = Math.min(bounds.left, piece.x - radius); bounds.right = Math.max(bounds.right, piece.x + radius);
      bounds.bottom = Math.min(bounds.bottom, piece.altitude - radius); bounds.top = Math.max(bounds.top, piece.altitude + radius);
      grounded = grounded && piece.altitude <= radius && piece.speedX === 0 && piece.speedY === 0;
    }
    if (!(mass > 0)) return;
    terminalPieces = true;
    target.downRangeDistance = x / mass; target.altitude = y / mass;
    target.speedX = vx / mass; target.speedY = vy / mass;
    target.landed = target.onTheGround = grounded;
    target.crashed = false;
    target.dynamicPressure = target.thrustAcceleration = 0;
  }
  function frameTerminalPieces(view: CameraFollowView) {
    if (options.mode !== 'follow') return;
    // Existing enclosing source envelopes are conservative display bounds,
    // not new fragment mechanics. Centre them on the tracked dry-mass centroid
    // so lighter pieces remain framed without moving the camera target.
    const halfX = Math.max(target.downRangeDistance - bounds.left, bounds.right - target.downRangeDistance);
    const halfY = Math.max(target.altitude - bounds.bottom, bounds.top - target.altitude);
    bounds.left = target.downRangeDistance - halfX; bounds.right = target.downRangeDistance + halfX;
    bounds.bottom = target.altitude - halfY; bounds.top = target.altitude + halfY;
    // Only widen the existing/manual FOV; a breakup must not cause a zoom-in.
    fit(view, 0, 1);
  }
  function keepTerminalPiecesInFrame(view: CameraFollowView) {
    const vp = view.viewport, cam = view.camera;
    // Inherited velocity can vastly exceed the rapidly decelerating pieces.
    // Preserve the follow law inside the current envelope's available margin;
    // constrain only an edge crossing, just as the intact Ship framing does.
    const halfX = vp.physicalWidth * 0.45, halfY = vp.physicalHeight * 0.45;
    const left = bounds.right - halfX, right = bounds.left + halfX;
    const bottom = bounds.top - halfY, top = bounds.bottom + halfY;
    if (left <= right) cam.posX = Math.max(left, Math.min(right, cam.posX));
    if (bottom <= top) cam.posY = Math.max(vp.physicalHeight / 2, bottom, Math.min(top, cam.posY));
  }
  function writeBounds(out: typeof bounds, pose: SimState['kinematics'], height: number, diameter: number) {
    const x = (Math.abs(Math.sin(pose.pitch)) * height + Math.abs(Math.cos(pose.pitch)) * diameter) / 2;
    const y = (Math.abs(Math.cos(pose.pitch)) * height + Math.abs(Math.sin(pose.pitch)) * diameter) / 2;
    out.left = pose.downRangeDistance - x; out.right = pose.downRangeDistance + x;
    out.bottom = pose.altitude - y; out.top = pose.altitude + y;
  }
  function fit(view: CameraFollowView, groundSpan = 0, nativeShare = 1) {
    const vp = view.viewport;
    const required = Math.max(groundSpan, (bounds.top - bounds.bottom) / 0.7,
      (bounds.right - bounds.left) / 0.7 * vp.height / vp.width);
    const height = required + (Math.max(vp.physicalHeight, required) - required) * nativeShare;
    fitted.width = vp.width; fitted.height = vp.height;
    fitted.physicalHeight = height; fitted.physicalWidth = height * vp.width / vp.height;
    fitted.scale = vp.height / height;
    view.viewport = fitted;
  }
  function frameBooster(view: CameraFollowView, state: SimState, model: VehicleDefinition) {
    if (model.id !== 'super-heavy') return;
    writeBounds(bounds, state.kinematics, model.height, 17);
    const caught = state.status.landed && !state.status.onTheGround;
    if (caught) {
      // A real airborne catch must include the pad at the unchanged first
      // verdict frame. The ordinary camera floor/damping still owns position.
      bounds.left = Math.min(bounds.left, starBaseXPos);
      bounds.right = Math.max(bounds.right, starBaseXPos);
      bounds.bottom = Math.min(bounds.bottom, 0);
    }
    // The fixed physical target is the frame centre; its distance to ground
    // therefore needs twice that span to keep the pad inside the first frame.
    fit(view, caught ? 2 * Math.max(0, state.kinematics.altitude) : 0);
  }
  function framePair(view: CameraFollowView, mission: MissionState) {
    const a = mission.ship.kinematics, b = mission.booster.kinematics;
    // Spatial handoff, never a scripted timer or predicted separation.
    const gap = Math.hypot(a.downRangeDistance - b.downRangeDistance, a.altitude - b.altitude);
    const length = SHIP.height + SUPER_HEAVY.height;
    if (gap > length) {
      pairFraming = false;
      return;
    }
    writeBounds(shipBounds, a, SHIP.height, SHIP.diameter);
    writeBounds(boosterBounds, b, SUPER_HEAVY.height, 17);
    bounds.left = Math.min(shipBounds.left, boosterBounds.left);
    bounds.right = Math.max(shipBounds.right, boosterBounds.right);
    bounds.bottom = Math.min(shipBounds.bottom, boosterBounds.bottom);
    bounds.top = Math.max(shipBounds.top, boosterBounds.top);
    // Ease from readable hull-bounds framing to the native selected-body view
    // as the real gap grows from attached centre spacing to spatial handoff.
    const t = Math.max(0, Math.min(1, (gap - length / 2) / (length / 2)));
    const share = t * t * (3 - 2 * t);
    const centreX = (bounds.left + bounds.right) / 2;
    const centreY = (bounds.bottom + bounds.top) / 2;
    target.downRangeDistance = centreX + (target.downRangeDistance - centreX) * share;
    target.altitude = centreY + (target.altitude - centreY) * share;
    target.speedX = (a.speedX + b.speedX) / 2 + (target.speedX - (a.speedX + b.speedX) / 2) * share;
    target.speedY = (a.speedY + b.speedY) / 2 + (target.speedY - (a.speedY + b.speedY) / 2) * share;
    fit(view, 0, share);
  }
  function position(view: CameraFollowView) {
    const cam = view.camera;
    cam.posX = target.downRangeDistance;
    cam.posY = Math.max(view.viewport.physicalHeight / 2, target.altitude);
    cam.speedX = target.speedX; cam.speedY = target.speedY;
    cam.accX = 0; cam.accY = 0;
    cam.shakeX = 0; cam.shakeY = 0;
    cam.padHeld = false;
  }
  function keepHullInFrame(view: CameraFollowView, state: SimState) {
    const vp = view.viewport, cam = view.camera;
    writeBounds(bounds, state.kinematics, SHIP.height, SHIP_VISUAL_DIAMETER);
    // The original law bounds shake around a point. At the native landscape
    // minimum, that point can fit while the nose clips. Only constrain an edge
    // crossing; preserve native FOV, velocity, lead and all interior motion.
    const inset = 0.5 / vp.scale;
    const left = bounds.right - vp.physicalWidth / 2 + inset - cam.shakeX;
    const right = bounds.left + vp.physicalWidth / 2 - inset - cam.shakeX;
    const bottom = bounds.top - vp.physicalHeight / 2 + inset - cam.shakeY;
    const top = bounds.bottom + vp.physicalHeight / 2 - inset - cam.shakeY;
    if (left <= right) cam.posX = Math.max(left, Math.min(right, cam.posX));
    if (bottom <= top) cam.posY = Math.max(vp.physicalHeight / 2, bottom, Math.min(top, cam.posY));
  }
  return {
    reset(view, state, mission, model = SHIP) {
      pairFraming = true;
      read(state, model);
      view.followAltitude(target.altitude);
      if (terminalPieces) frameTerminalPieces(view);
      else {
        frameBooster(view, state, model);
        if (mission) framePair(view, mission);
      }
      position(view);
    },
    select(view, state, model = SHIP) {
      pairFraming = false;
      read(state, model);
      view.followAltitude(target.altitude);
      if (terminalPieces) frameTerminalPieces(view);
      else frameBooster(view, state, model);
      position(view);
    },
    step(view, state, mission, model = SHIP) {
      read(state, model);
      view.followAltitude(target.altitude);
      if (terminalPieces) {
        pairFraming = false;
        frameTerminalPieces(view);
      } else {
        frameBooster(view, state, model);
        if (mission && pairFraming) framePair(view, mission);
      }
      updateCamera(view.camera, target, view.viewport, DT, options);
      if (terminalPieces && options.mode === 'follow') keepTerminalPiecesInFrame(view);
      if (!terminalPieces && !mission && model.id === SHIP.id && options.mode === 'follow'
        && !state.autopilot.demoAutoLandOn && !state.failures.crashed) {
        keepHullInFrame(view, state);
      }
    },
    setMode(mode) {
      options.mode = mode;
    },
  };
}
