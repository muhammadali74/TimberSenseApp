/**
 * WS-E. Projection math that makes the first-person 3D view match the front video exactly.
 *
 * The video is a pinhole image (camera.json: fx, fy, cx, cy in pixels of a width×height frame).
 * We scale that frame to fit inside the canvas ("contain") and build the projection matrix straight
 * from the scaled intrinsics, so horizontal AND vertical FOV both match without stretching. Because
 * the canvas has a different shape than the video, the 3D view also shows a little beyond the frame;
 * `frameRect` tells the overlay where the video's edges are.
 */
import type * as THREE from 'three';
import type {CameraIntrinsics} from '@/types';
import type {Calibration} from './replayUi';

export interface Intrinsics {
  width: number;
  height: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

/** Used when a plot has no camera.json: a 16:9 pinhole with ~90° × 59° FOV. */
export const FALLBACK_INTRINSICS: Intrinsics = {
  width: 3840,
  height: 2160,
  fx: 1920 / Math.tan(rad(45)),
  fy: 1080 / Math.tan(rad(29.5)),
  cx: 1919.5,
  cy: 1079.5,
};

export const hfovOf = (k: Intrinsics) => deg(2 * Math.atan(k.width / 2 / k.fx));
export const vfovOf = (k: Intrinsics) => deg(2 * Math.atan(k.height / 2 / k.fy));

/** Intrinsics from camera.json, with the user's H/V FOV overrides (null = use calibration) applied. */
export function effectiveIntrinsics(camera: CameraIntrinsics | null, cal: Calibration): Intrinsics {
  const base: Intrinsics = camera
    ? {width: camera.width, height: camera.height, fx: camera.fx, fy: camera.fy, cx: camera.cx, cy: camera.cy}
    : FALLBACK_INTRINSICS;
  return {
    ...base,
    fx: cal.hfovDeg == null ? base.fx : base.width / 2 / Math.tan(rad(cal.hfovDeg) / 2),
    fy: cal.vfovDeg == null ? base.fy : base.height / 2 / Math.tan(rad(cal.vfovDeg) / 2),
  };
}

/** Where the video frame sits on a canvas of size W×H when scaled to fit inside it. */
export function frameRect(k: Intrinsics, W: number, H: number) {
  const s = Math.min(W / k.width, H / k.height);
  const w = k.width * s;
  const h = k.height * s;
  return {scale: s, left: (W - w) / 2, top: (H - h) / 2, width: w, height: h};
}

/**
 * OpenGL projection for a pinhole camera (0-based pixels, image y down, camera looking down −Z),
 * with the video frame fitted inside a W×H canvas.
 */
export function setProjectionFromIntrinsics(
  camera: THREE.PerspectiveCamera,
  k: Intrinsics,
  W: number,
  H: number,
): void {
  const r = frameRect(k, W, H);
  const fx = k.fx * r.scale;
  const fy = k.fy * r.scale;
  // principal point in canvas pixels (pixel centres at +0.5)
  const cx = r.left + (k.cx + 0.5) * r.scale;
  const cy = r.top + (k.cy + 0.5) * r.scale;
  const n = camera.near;
  const f = camera.far;
  // biome-ignore format: matrix layout
  camera.projectionMatrix.set(
    (2 * fx) / W, 0, 1 - (2 * cx) / W, 0,
    0, (2 * fy) / H, (2 * cy) / H - 1, 0,
    0, 0, -(f + n) / (f - n), (-2 * f * n) / (f - n),
    0, 0, -1, 0,
  );
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
