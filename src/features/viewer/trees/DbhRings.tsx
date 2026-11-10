/**
 * WS-C. Dotted DBH rings reproducing the pipeline's *_dbh_cylinders.ply (from `tree.dbhRings`):
 * the ring at the measured DBH height in Farmevo orange, the others white. Dots on the far
 * side of the stem are faded so the ring reads in 3D; drawn on top of the points.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {fmtDbh} from '@/lib/format';
import {BREAST_HEIGHT_M, type DbhRing, type Tree} from '@/types';
import {MeasureLabel} from './MeasureLabel';

/** Every 10° — sparse enough that the ring reads as dots at any zoom. */
const DOTS_PER_RING = 36;
/** Dot diameters in metres (scale with zoom), clamped to a minimum on screen. */
const DBH_DOT_M = 0.024;
const OTHER_DOT_M = 0.018;
const MIN_DOT_PX = 4;
const MAX_DOT_PX = 16;
/** Cyan contrasts with both bark and the orange selection tint. */
export const DBH_RING_COLOR = '#22d3ee';
const OTHER_RING_COLOR = '#ffffff';

const vertexShader = /* glsl */ `
attribute vec3 aOut;
uniform float uSize;        // metres
uniform float uProjScale;   // drawing-buffer px per metre at distance 1
uniform float uPixelRatio;
varying float vFacing;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 outV = normalize(mat3(modelViewMatrix) * aOut);
  vFacing = dot(outV, normalize(-mv.xyz));
  gl_PointSize = clamp(uSize * uProjScale / max(-mv.z, 0.05), ${MIN_DOT_PX.toFixed(1)} * uPixelRatio, ${MAX_DOT_PX.toFixed(1)} * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vFacing;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  vec3 col = d > 0.55 ? uColor * 0.25 : uColor;   // dark rim for contrast on bark
  float alpha = vFacing > -0.05 ? 1.0 : 0.38;      // fade the far side of the stem
  gl_FragColor = vec4(col, alpha);
}`;

/** Fallback when the pipeline has no ring fit: one horizontal ring at 1.3 m around the base. */
function fallbackRings(tree: Tree): {rings: DbhRing[]; index: number} | null {
  if (!tree.dbhCm) return null;
  const [x, y, z] = tree.base;
  return {rings: [{center: [x, y, z + BREAST_HEIGHT_M], normal: [0, 0, 1], radiusM: tree.dbhCm / 200}], index: 0};
}

function ringGeometry(ring: DbhRing): THREE.BufferGeometry {
  const c = new THREE.Vector3(...ring.center);
  const n = new THREE.Vector3(...ring.normal).normalize();
  const u = new THREE.Vector3()
    .crossVectors(n, Math.abs(n.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0))
    .normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  const pos = new Float32Array(DOTS_PER_RING * 3);
  const out = new Float32Array(DOTS_PER_RING * 3);
  for (let i = 0; i < DOTS_PER_RING; i++) {
    const a = (i / DOTS_PER_RING) * Math.PI * 2;
    const dir = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
    const p = c.clone().addScaledVector(dir, ring.radiusM);
    pos.set([p.x, p.y, p.z], i * 3);
    out.set([dir.x, dir.y, dir.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOut', new THREE.BufferAttribute(out, 3));
  return g;
}

function Ring({ring, isDbh, pixelRatio}: {ring: DbhRing; isDbh: boolean; pixelRatio: number}) {
  const geometry = useMemo(() => ringGeometry(ring), [ring]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          // THREE.Color converts the sRGB hex to linear, matching the EDL pipeline.
          uColor: {value: new THREE.Color(isDbh ? DBH_RING_COLOR : OTHER_RING_COLOR)},
          uSize: {value: isDbh ? DBH_DOT_M : OTHER_DOT_M},
          uProjScale: {value: 800},
          uPixelRatio: {value: pixelRatio},
        },
      }),
    [isDbh, pixelRatio],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const height = useThree((st) => st.size.height);
  useFrame(({camera}) => {
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 55;
    material.uniforms.uProjScale.value = (height * pixelRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  });
  return <points geometry={geometry} material={material} renderOrder={isDbh ? 14 : 13} frustumCulled={false} />;
}

export function DbhRings({tree, side, pixelRatio}: {tree: Tree; side: THREE.Vector3; pixelRatio: number}) {
  const data = tree.dbhRings?.length ? {rings: tree.dbhRings, index: tree.dbhRingIndex ?? 0} : fallbackRings(tree);
  if (!data) return null;
  const dbh = data.rings[data.index];
  const labelPos = new THREE.Vector3(...dbh.center).addScaledVector(side, -(dbh.radiusM + 0.55));
  return (
    <group>
      {data.rings.map((r, i) => (
        <Ring key={i} ring={r} isDbh={i === data.index} pixelRatio={pixelRatio} />
      ))}
      <MeasureLabel position={labelPos.toArray() as [number, number, number]} tone="dbh">
        DBH {fmtDbh(tree.dbhCm)}
      </MeasureLabel>
    </group>
  );
}
