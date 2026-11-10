/**
 * WS-E. Pre-processed trajectory for smooth replay:
 *  - positions lightly smoothed (keeps the walking feel, removes SLAM jitter)
 *  - yaw smoothed with a speed-weighted Gaussian (standing still doesn't spin the view)
 *  - Catmull-Rom interpolation between the 10 Hz samples so the camera moves smoothly at 60 fps
 */
import type {Trajectory} from '@/types';

export interface Pose {
  x: number;
  y: number;
  /** sensor height above ground (trajectory Z = DTM + sensor height) */
  z: number;
  /** radians, CCW from +X; continuous (unwrapped) */
  yaw: number;
}

export interface TrajectoryPath {
  t: Float64Array;
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  yaw: Float64Array;
  duration: number;
  sensorHeightM: number;
  /** cumulative distance walked (m) at each sample */
  dist: Float64Array;
}

const POS_SIGMA_S = 0.12;
const YAW_SIGMA_S = 0.6;

function gaussianSmooth(t: Float64Array, v: Float64Array, sigma: number, weight?: Float64Array): Float64Array {
  const out = new Float64Array(v.length);
  let lo = 0;
  for (let i = 0; i < v.length; i++) {
    while (t[i] - t[lo] > 3 * sigma) lo++;
    let acc = 0;
    let wsum = 0;
    for (let j = lo; j < v.length && t[j] - t[i] <= 3 * sigma; j++) {
      const d = (t[j] - t[i]) / sigma;
      const w = Math.exp(-0.5 * d * d) * (weight ? weight[j] : 1);
      acc += v[j] * w;
      wsum += w;
    }
    out[i] = wsum > 1e-9 ? acc / wsum : v[i];
  }
  return out;
}

export function buildPath(traj: Trajectory): TrajectoryPath {
  const n = traj.samples.length;
  const t = new Float64Array(n);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const yawRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = traj.samples[i];
    t[i] = s[0];
    x[i] = s[1];
    y[i] = s[2];
    z[i] = s[3];
    // Unwrap so smoothing/interpolation never jumps across ±π.
    let a = s[4];
    if (i > 0) {
      const prev = yawRaw[i - 1];
      a += Math.round((prev - a) / (2 * Math.PI)) * 2 * Math.PI;
    }
    yawRaw[i] = a;
  }
  const xs = gaussianSmooth(t, x, POS_SIGMA_S);
  const ys = gaussianSmooth(t, y, POS_SIGMA_S);
  const zs = gaussianSmooth(t, z, POS_SIGMA_S * 2);
  // Speed weights: heading measured while standing still is mostly noise.
  const speed = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dt = Math.max(1e-3, t[b] - t[a]);
    speed[i] = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]) / dt;
  }
  const w = speed.map((s) => 0.05 + Math.min(1, s / 0.5));
  const yaw = gaussianSmooth(t, yawRaw, YAW_SIGMA_S, w);
  const dist = new Float64Array(n);
  for (let i = 1; i < n; i++) dist[i] = dist[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  return {t, x: xs, y: ys, z: zs, yaw, duration: traj.durationS || t[n - 1], sensorHeightM: traj.sensorHeightM, dist};
}

/** Index i such that t[i] <= time < t[i+1] (clamped). */
export function indexAt(path: TrajectoryPath, time: number): number {
  const {t} = path;
  if (time <= t[0]) return 0;
  if (time >= t[t.length - 1]) return t.length - 1;
  let lo = 0;
  let hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= time) lo = mid;
    else hi = mid;
  }
  return lo;
}

const catmull = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

export function poseAt(path: TrajectoryPath, time: number, out: Pose = {x: 0, y: 0, z: 0, yaw: 0}): Pose {
  const n = path.t.length;
  const i = indexAt(path, time);
  const j = Math.min(n - 1, i + 1);
  const span = path.t[j] - path.t[i];
  const u = span > 1e-9 ? Math.min(1, Math.max(0, (time - path.t[i]) / span)) : 0;
  const a = Math.max(0, i - 1);
  const d = Math.min(n - 1, j + 1);
  out.x = catmull(path.x[a], path.x[i], path.x[j], path.x[d], u);
  out.y = catmull(path.y[a], path.y[i], path.y[j], path.y[d], u);
  out.z = path.z[i] + (path.z[j] - path.z[i]) * u;
  out.yaw = path.yaw[i] + (path.yaw[j] - path.yaw[i]) * u;
  return out;
}

const cache = new WeakMap<Trajectory, TrajectoryPath>();

/** Shared, cached path for a loaded trajectory (all replay components use the same one). */
export function getPath(traj: Trajectory): TrajectoryPath {
  let p = cache.get(traj);
  if (!p) {
    p = buildPath(traj);
    cache.set(traj, p);
  }
  return p;
}
