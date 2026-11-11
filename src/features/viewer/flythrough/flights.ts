/**
 * WS-F. Camera flights for the three cinematic presets, built from trees.json and the plot bbox.
 * A flight is a sequence of segments, each mapping local progress u ∈ [0,1] to a camera position and
 * look target (plot frame, Z-up, metres). Paths are resampled by arc length, so speed is constant
 * apart from the eased start/end of each segment.
 *
 *  - orbit: a rising helix around the plot, looking at the canopy centre
 *  - walk:  greedy nearest-neighbour route over tree bases, weaving left/right past the stems at
 *           eye height, pushed ≥ STEM_CLEARANCE_M from every stem, looking a few metres ahead
 *  - tour:  the tallest trees one by one: crane over the canopy to each, slow arc around it
 *
 * Walk and tour start with a transit from the current view and end by rising back to an overview.
 */
import * as THREE from 'three';
import type {CloudData, Tree} from '@/types';
import type {GroundSampler} from '../core/ground';
import {EYE_HEIGHT_M} from '../core/WalkControls';
import type {FlythroughPreset} from '../store';

export const STEM_CLEARANCE_M = 0.6;
const PUSH_CLEARANCE_M = 0.85; // pushed slightly further, so smoothing can't eat into the 0.6 m minimum
const WALK_SPEED = 1.3; // m/s
const TRANSIT_SPEED = 3.5; // m/s
const TOUR_STOPS = 6;
const DWELL_S = 6;

export interface CameraPose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

export interface Segment {
  duration: number;
  /** Tree featured during this segment (tour stops). */
  treeId?: number;
  sample(u: number, pos: THREE.Vector3, target: THREE.Vector3): void;
}

export interface Flight {
  preset: FlythroughPreset;
  segments: Segment[];
  /** cumulative start time of each segment */
  starts: number[];
  duration: number;
  /** tour stops in visiting order */
  stops: number[];
  /** smallest horizontal distance from the eye-level path to a stem surface (walk), for checks */
  minStemClearanceM: number | null;
}

interface Stem {
  x: number;
  y: number;
  r: number;
  top: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const smoothstep = (u: number) => u * u * (3 - 2 * u);

/** 0→1 with eased ends and a constant-speed middle; `ramp` is the fraction spent accelerating. */
function trapezoid(u: number, ramp: number): number {
  const r = Math.min(0.5, Math.max(1e-3, ramp));
  const vmax = 1 / (1 - r); // area under the speed profile = 1
  if (u < r) return (0.5 * vmax * u * u) / r;
  if (u > 1 - r) {
    const w = 1 - u;
    return 1 - (0.5 * vmax * w * w) / r;
  }
  return 0.5 * vmax * r + vmax * (u - r);
}

/** Dense polyline with arc-length lookup. */
class Polyline {
  readonly pts: THREE.Vector3[];
  readonly cum: number[];
  constructor(pts: THREE.Vector3[]) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  get length() {
    return this.cum[this.cum.length - 1];
  }
  at(s: number, out: THREE.Vector3): THREE.Vector3 {
    const {cum, pts} = this;
    if (s <= 0) return out.copy(pts[0]);
    if (s >= this.length) {
      // Extrapolate along the last direction (look-ahead past the end).
      const n = pts.length;
      const dir = pts[n - 1]
        .clone()
        .sub(pts[n - 2])
        .normalize();
      return out.copy(pts[n - 1]).addScaledVector(dir, s - this.length);
    }
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const f = (s - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    return out.lerpVectors(pts[lo], pts[hi], f);
  }
}

function spline(points: THREE.Vector3[], spacing: number): Polyline {
  if (points.length < 2) return new Polyline([points[0], points[0].clone()]);
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const n = Math.max(8, Math.ceil(curve.getLength() / spacing));
  curve.arcLengthDivisions = n * 2;
  return new Polyline(curve.getSpacedPoints(n));
}

function stemsOf(trees: Tree[]): Stem[] {
  return trees.map((t) => ({
    x: t.base[0],
    y: t.base[1],
    r: Math.max(0.05, (t.dbhCm ?? 25) / 200),
    top: t.top[2],
  }));
}

/** Horizontal distance from (x, y) to the nearest stem surface. */
function stemClearance(x: number, y: number, stems: Stem[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const s of stems) best = Math.min(best, Math.hypot(x - s.x, y - s.y) - s.r);
  return best;
}

/** Push a point horizontally out of every stem's clearance radius. */
function pushOut(p: THREE.Vector3, stems: Stem[], clearance: number) {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const s of stems) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy);
      const need = s.r + clearance;
      if (d >= need) continue;
      const k = d > 1e-6 ? need / d : 0;
      if (k) {
        p.x = s.x + dx * k;
        p.y = s.y + dy * k;
      } else p.x = s.x + need;
      moved = true;
    }
    if (!moved) return;
  }
}

function movingAverage(pts: THREE.Vector3[], half: number): THREE.Vector3[] {
  return pts.map((_, i) => {
    if (i === 0 || i === pts.length - 1) return pts[i].clone();
    const a = Math.max(0, i - half);
    const b = Math.min(pts.length - 1, i + half);
    const acc = new THREE.Vector3();
    for (let j = a; j <= b; j++) acc.add(pts[j]);
    return acc.divideScalar(b - a + 1);
  });
}

/** Greedy nearest-neighbour ordering, starting from `first`. */
function greedyOrder<T extends {x: number; y: number}>(items: T[], first: number): T[] {
  const left = items.slice();
  const out = [left.splice(first, 1)[0]];
  while (left.length) {
    const last = out[out.length - 1];
    let bi = 0;
    let bd = Number.POSITIVE_INFINITY;
    left.forEach((p, i) => {
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}

/** Crane move between two poses: up to `cruiseZ`, across, down. Target eases between the two. */
function transit(from: CameraPose, to: CameraPose, cruiseZ: number | null): Segment {
  const pts = [from.pos.clone()];
  if (cruiseZ != null) {
    const up = Math.max(cruiseZ, from.pos.z, to.pos.z);
    const a = from.pos.clone().lerp(to.pos, 0.2).setZ(up);
    const b = from.pos.clone().lerp(to.pos, 0.8).setZ(up);
    pts.push(a, b);
  }
  pts.push(to.pos.clone());
  const line = spline(pts, 0.1);
  const duration = Math.max(3, Math.min(9, line.length / TRANSIT_SPEED + 1.5));
  const t0 = from.target.clone();
  const t1 = to.target.clone();
  return {
    duration,
    sample(u, pos, target) {
      const k = smoothstep(u);
      line.at(k * line.length, pos);
      target.lerpVectors(t0, t1, k);
    },
  };
}

function build(preset: FlythroughPreset, segments: Segment[], stops: number[], clearance: number | null): Flight {
  const starts: number[] = [];
  let acc = 0;
  for (const s of segments) {
    starts.push(acc);
    acc += s.duration;
  }
  return {preset, segments, starts, duration: acc, stops, minStemClearanceM: clearance};
}

// ── presets ──────────────────────────────────────────────────────────────────

interface Ctx {
  cloud: CloudData;
  trees: Tree[];
  ground: GroundSampler;
  start: CameraPose;
}

function plotDims(cloud: CloudData) {
  const {min, max} = cloud.header.bbox;
  const span = Math.max(max[0] - min[0], max[1] - min[1], 4);
  return {min, max, span, canopy: Math.max(3, max[2] - Math.max(0, min[2]))};
}

function overviewPose(cloud: CloudData): CameraPose {
  const {span, canopy} = plotDims(cloud);
  return {
    pos: new THREE.Vector3(span * 0.75, -span * 0.75, canopy * 0.25 + span * 0.45),
    target: new THREE.Vector3(0, 0, canopy * 0.25),
  };
}

function orbitFlight({cloud, start}: Ctx): Flight {
  const {span, canopy} = plotDims(cloud);
  const radius = Math.max(8, span * 0.62);
  const a0 = Math.atan2(start.pos.y, start.pos.x);
  const turns = 1.15;
  const duration = 40;
  const pose = (u: number, pos: THREE.Vector3, target: THREE.Vector3) => {
    const k = trapezoid(u, 0.12);
    const a = a0 + k * turns * 2 * Math.PI;
    const r = radius * (1.15 - 0.3 * k);
    pos.set(Math.cos(a) * r, Math.sin(a) * r, canopy * 0.55 + k * (canopy * 1.1 + span * 0.25));
    target.set(0, 0, canopy * (0.4 - 0.15 * k));
  };
  const first = {pos: new THREE.Vector3(), target: new THREE.Vector3()};
  pose(0, first.pos, first.target);
  return build('orbit', [transit(start, first, null), {duration, sample: pose}], [], null);
}

function walkFlight({cloud, trees, ground, start}: Ctx): Flight {
  const {min, max} = plotDims(cloud);
  const stems = stemsOf(trees);
  const route = trees.filter((t) => t.valid);
  const nodes = (route.length >= 2 ? route : trees).map((t) => ({
    x: t.base[0],
    y: t.base[1],
    r: (t.dbhCm ?? 25) / 200,
  }));
  if (nodes.length < 2) return orbitFlight({cloud, trees, ground, start});

  // Start at the tree closest to the corner the viewer is looking from.
  const sx = Math.sign(start.pos.x) || 1;
  const sy = Math.sign(start.pos.y) || -1;
  let first = 0;
  nodes.forEach((n, i) => {
    if (n.x * sx + n.y * sy > nodes[first].x * sx + nodes[first].y * sy) first = i;
  });
  const order = greedyOrder(nodes, first);

  // Waypoints beside each stem, alternating sides so the route weaves between trees.
  const way: THREE.Vector3[] = [];
  order.forEach((n, i) => {
    const prev = order[Math.max(0, i - 1)];
    const next = order[Math.min(order.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    const side = i % 2 ? 1 : -1;
    const off = n.r + 1.0;
    way.push(new THREE.Vector3(n.x + (-ty / tl) * off * side, n.y + (tx / tl) * off * side, 0));
  });
  // Lead-in and lead-out, 3 m beyond the first and last trees.
  const lead = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().add(a.clone().sub(b).setZ(0).setLength(3));
  way.unshift(lead(way[0], way[1]));
  way.push(lead(way[way.length - 1], way[way.length - 2]));

  // Dense path → keep inside the plot → push away from stems → smooth → push again.
  let pts = spline(way, 0.2).pts.map((p) => p.clone());
  const clamp = (p: THREE.Vector3) => {
    p.x = Math.min(max[0] - 0.5, Math.max(min[0] + 0.5, p.x));
    p.y = Math.min(max[1] - 0.5, Math.max(min[1] + 0.5, p.y));
  };
  for (let pass = 0; pass < 3; pass++) {
    for (const p of pts) {
      clamp(p);
      pushOut(p, stems, PUSH_CLEARANCE_M);
    }
    pts = movingAverage(pts, 4);
  }
  for (const p of pts) pushOut(p, stems, PUSH_CLEARANCE_M);
  // Eye height over the terrain, smoothed so the camera doesn't bob.
  for (const p of pts) p.z = ground.heightAt(p.x, p.y) + EYE_HEIGHT_M;
  const zs = movingAverage(pts, 10).map((p) => p.z);
  pts.forEach((p, i) => {
    p.z = zs[i];
  });
  const line = new Polyline(pts);
  const minClear = Math.min(...pts.map((p) => stemClearance(p.x, p.y, stems)));

  const L = line.length;
  const duration = L / WALK_SPEED + 2;
  const ramp = Math.min(0.2, 2 / duration);
  const look = new THREE.Vector3();
  const walk: Segment = {
    duration,
    sample(u, pos, target) {
      const s = trapezoid(u, ramp) * L;
      line.at(s, pos);
      line.at(s + 4, look);
      target.set(look.x, look.y, look.z - 0.25);
    },
  };
  const entry = {pos: new THREE.Vector3(), target: new THREE.Vector3()};
  walk.sample(0, entry.pos, entry.target);
  const exit = {pos: new THREE.Vector3(), target: new THREE.Vector3()};
  walk.sample(1, exit.pos, exit.target);
  const cruise = Math.max(...stems.map((s) => s.top), max[2]) + 2;
  return build('walk', [transit(start, entry, cruise), walk, transit(exit, overviewPose(cloud), cruise)], [], minClear);
}

function tourFlight({cloud, trees, ground, start}: Ctx): Flight {
  const {max} = plotDims(cloud);
  const stems = stemsOf(trees);
  const candidates = trees
    .filter((t) => t.valid)
    .sort((a, b) => (b.heightM ?? b.top[2] - b.base[2]) - (a.heightM ?? a.top[2] - a.base[2]))
    .slice(0, TOUR_STOPS);
  if (!candidates.length) return orbitFlight({cloud, trees, ground, start});
  const items = candidates.map((t) => ({x: t.base[0], y: t.base[1], tree: t}));
  let first = 0;
  items.forEach((n, i) => {
    const d = Math.hypot(n.x - start.pos.x, n.y - start.pos.y);
    if (d < Math.hypot(items[first].x - start.pos.x, items[first].y - start.pos.y)) first = i;
  });
  const order = greedyOrder(items, first);
  const cruise = Math.max(...stems.map((s) => s.top), max[2]) + 2;

  const segments: Segment[] = [];
  let prev: CameraPose = start;
  for (const {tree} of order) {
    const h = Math.max(2, tree.top[2] - tree.base[2]);
    const look = new THREE.Vector3(tree.base[0], tree.base[1], tree.base[2] + h * 0.45);
    const dist = THREE.MathUtils.clamp(h * 0.9 + 2, 5, 9);
    const camZ = tree.base[2] + h * 0.55;
    const sweep = THREE.MathUtils.degToRad(35);
    // Pick the viewing side with the clearest line of sight, preferring the side we arrive from.
    const others = stems.filter((s) => s.x !== tree.base[0] || s.y !== tree.base[1]);
    const arrive = Math.atan2(prev.pos.y - look.y, prev.pos.x - look.x);
    let bestA = arrive;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * 2 * Math.PI;
      let score = 0;
      for (const am of [a, a + sweep]) {
        const cx = look.x + Math.cos(am) * dist;
        const cy = look.y + Math.sin(am) * dist;
        // sample the sight line; occluding stems below the camera's height cost a lot
        for (let f = 0.15; f < 1; f += 0.15) {
          const px = look.x + (cx - look.x) * f;
          const py = look.y + (cy - look.y) * f;
          const c = stemClearance(px, py, others);
          if (c < 0.4) score -= 3;
        }
        score += Math.min(2, stemClearance(cx, cy, others));
      }
      score += 0.8 * Math.cos(a - arrive);
      if (score > bestScore) {
        bestScore = score;
        bestA = a;
      }
    }
    const poseAtAngle = (a: number, pos: THREE.Vector3) => {
      pos.set(look.x + Math.cos(a) * dist, look.y + Math.sin(a) * dist, camZ);
      pos.z = Math.max(pos.z, ground.heightAt(pos.x, pos.y) + EYE_HEIGHT_M);
    };
    const arrival: CameraPose = {pos: new THREE.Vector3(), target: look.clone()};
    poseAtAngle(bestA, arrival.pos);
    segments.push(transit(prev, arrival, cruise));
    segments.push({
      duration: DWELL_S,
      treeId: tree.id,
      sample(u, pos, target) {
        poseAtAngle(bestA + sweep * smoothstep(u), pos);
        target.copy(look);
      },
    });
    const leave: CameraPose = {pos: new THREE.Vector3(), target: look.clone()};
    poseAtAngle(bestA + sweep, leave.pos);
    prev = leave;
  }
  segments.push(transit(prev, overviewPose(cloud), cruise));
  return build(
    'tour',
    segments,
    order.map((o) => o.tree.id),
    null,
  );
}

export function buildFlight(preset: FlythroughPreset, ctx: Ctx): Flight {
  if (preset === 'walk') return walkFlight(ctx);
  if (preset === 'tour') return tourFlight(ctx);
  return orbitFlight(ctx);
}

/** Pose at absolute time t; returns the featured tree (tour stops) or null. */
export function sampleFlight(f: Flight, t: number, pos: THREE.Vector3, target: THREE.Vector3): number | null {
  const time = Math.min(f.duration, Math.max(0, t));
  let i = f.segments.length - 1;
  while (i > 0 && f.starts[i] > time) i--;
  const seg = f.segments[i];
  seg.sample(Math.min(1, (time - f.starts[i]) / seg.duration), pos, target);
  return seg.treeId ?? null;
}
