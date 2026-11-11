/**
 * WS-E. Time colouring of the capture path, shared by the 3D path, the overview legend and the
 * replay scrubber. Interpolates in hue (teal → green → yellow → orange) rather than RGB, which
 * would pass through a muddy grey-brown that disappears against the ground in the bird's-eye view.
 */
import * as THREE from 'three';

export const PATH_START = '#14b8a6';
export const PATH_END = '#f57e26';

const start = new THREE.Color(PATH_START);
const end = new THREE.Color(PATH_END);

/** Colour at fraction f (0 = start of the capture, 1 = end). */
export function pathColor(f: number, out = new THREE.Color()): THREE.Color {
  return out.copy(start).lerpHSL(end, Math.min(1, Math.max(0, f)));
}

export const PATH_GRADIENT_CSS = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1]
  .map((f) => `#${pathColor(f).getHexString()}`)
  .join(', ')})`;
