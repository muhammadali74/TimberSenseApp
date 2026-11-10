/**
 * WS-C. CPU tree picking against per-tree proxy capsules built from trees.json
 * (independent of the point shader). Each tree contributes a stem capsule (base → top) and,
 * when it has a crown radius, a crown capsule over its upper part.
 */
import * as THREE from 'three';
import type {Tree} from '@/types';

export interface TreeProxy {
  id: number;
  a: THREE.Vector3;
  b: THREE.Vector3;
  radius: number;
}

const MIN_STEM_PICK_RADIUS_M = 0.3;
const REJECTED_HEIGHT_M = 1.5;

export function buildProxies(trees: Tree[]): TreeProxy[] {
  const out: TreeProxy[] = [];
  for (const t of trees) {
    const a = new THREE.Vector3(...t.base);
    let b = new THREE.Vector3(...t.top);
    if (b.distanceTo(a) < 0.5) b = a.clone().add(new THREE.Vector3(0, 0, REJECTED_HEIGHT_M));
    const stemR = Math.max(((t.dbhCm ?? 20) / 200) * 1.6, MIN_STEM_PICK_RADIUS_M);
    out.push({id: t.id, a, b, radius: stemR});
    if (t.crownRadiusM && t.crownRadiusM > stemR) {
      // Crown occupies roughly the top 45% of the tree.
      const crownStart = a.clone().lerp(b, 0.55);
      out.push({id: t.id, a: crownStart, b: b.clone(), radius: t.crownRadiusM * 0.85});
    }
  }
  return out;
}

const tmpU = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpW = new THREE.Vector3();

/**
 * Closest approach between a ray (unit direction) and segment a→b.
 * Returns the gap at closest approach and the distance along the ray to it.
 */
function raySegment(ray: THREE.Ray, a: THREE.Vector3, b: THREE.Vector3): {dist: number; t: number} {
  const u = ray.direction;
  const v = tmpV.subVectors(b, a);
  const w = tmpW.subVectors(ray.origin, a);
  const uv = u.dot(v);
  const vv = v.dot(v);
  const uw = u.dot(w);
  const vw = v.dot(w);
  const den = vv - uv * uv; // |u| = 1
  const s = den < 1e-9 ? 0 : THREE.MathUtils.clamp((vw - uv * uw) / den, 0, 1);
  const t = Math.max(0, uv * s - uw);
  tmpU.copy(u).multiplyScalar(t).add(ray.origin).sub(v.multiplyScalar(s).add(a));
  return {dist: tmpU.length(), t};
}

/** Nearest tree hit along the ray, or null. */
export function pickTree(ray: THREE.Ray, proxies: TreeProxy[]): {id: number; t: number} | null {
  let best: {id: number; t: number} | null = null;
  for (const p of proxies) {
    const r = raySegment(ray, p.a, p.b);
    if (r.dist > p.radius || r.t <= 0) continue;
    // Penalise hits far off-axis slightly so the stem you point at wins over a neighbour's crown.
    const score = r.t + (r.dist / p.radius) * 0.5;
    if (!best || score < best.t) best = {id: p.id, t: score};
  }
  return best;
}
