/**
 * WS-B. Camera modes:
 *  - orbit: OrbitControls around a pivot (double-click a point to re-centre the pivot)
 *  - walk:  WalkControls
 *  - flythrough / follow: controls disabled; WS-F / WS-E drive the camera themselves.
 * Handles `cameraRequest` (view presets, focus on a tree) with an eased transition.
 */
import {OrbitControls} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import type {CloudData, Tree} from '@/types';
import {usePlotData} from '../PlotDataContext';
import {type CameraRequest, useViewerStore} from '../store';
import {homePose} from './ViewerCanvas';
import {WalkControls} from './WalkControls';

interface Transition {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
  duration: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function poseFor(
  req: CameraRequest,
  cloud: CloudData,
  treesById: Map<number, Tree>,
  camera: THREE.Camera,
): {position: THREE.Vector3; target: THREE.Vector3} | null {
  const {min, max} = cloud.header.bbox;
  const span = Math.max(max[0] - min[0], max[1] - min[1], 4);
  const midZ = (max[2] - min[2]) * 0.35;
  if (req.kind === 'view') {
    if (req.view === 'reset') return homePose(cloud.header.bbox);
    if (req.view === 'top')
      return {position: new THREE.Vector3(0, -0.01, max[2] + span * 1.25), target: new THREE.Vector3(0, 0, 0)};
    return {position: new THREE.Vector3(0, -span * 1.25, midZ + 1), target: new THREE.Vector3(0, 0, midZ)};
  }
  const tree = treesById.get(req.id);
  if (!tree) return null;
  const base = new THREE.Vector3(...tree.base);
  const h = Math.max(tree.top[2] - tree.base[2], 2);
  const target = base.clone().add(new THREE.Vector3(0, 0, h * 0.45));
  const dir = camera.position.clone().sub(target).setZ(0);
  if (dir.lengthSq() < 1e-6) dir.set(1, -1, 0);
  dir.normalize();
  const dist = Math.max(h * 1.4, 5);
  return {
    position: target
      .clone()
      .addScaledVector(dir, dist)
      .add(new THREE.Vector3(0, 0, h * 0.3)),
    target,
  };
}

/** Nearest cloud point under the cursor (CPU screen-space search). */
function pickPoint(cloud: CloudData, camera: THREE.Camera, ndcX: number, ndcY: number, w: number, h: number) {
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
  const p = cloud.position;
  const radiusPx = 6;
  const rx = (radiusPx / w) * 2;
  const ry = (radiusPx / h) * 2;
  let best = -1;
  let bestDepth = Number.POSITIVE_INFINITY;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i];
    const y = p[i + 1];
    const z = p[i + 2];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.05) continue;
    const cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw;
    if (Math.abs(cx - ndcX) > rx) continue;
    const cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    if (Math.abs(cy - ndcY) > ry) continue;
    if (cw < bestDepth) {
      bestDepth = cw;
      best = i;
    }
  }
  return best < 0 ? null : new THREE.Vector3(p[best], p[best + 1], p[best + 2]);
}

export function CameraController() {
  const {cloud, treesById} = usePlotData();
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useRef<OrbitControlsImpl>(null);
  const transition = useRef<Transition | null>(null);
  const cameraMode = useViewerStore((s) => s.cameraMode);
  const request = useViewerStore((s) => s.cameraRequest);

  const startTransition = (position: THREE.Vector3, target: THREE.Vector3, duration = 0.9) => {
    const c = controls.current;
    if (!c) return;
    transition.current = {
      fromPos: camera.position.clone(),
      toPos: position,
      fromTarget: c.target.clone(),
      toTarget: target,
      t: 0,
      duration,
    };
  };

  // Initial pivot.
  useEffect(() => {
    controls.current?.target.copy(homePose(cloud.header.bbox).target);
    controls.current?.update();
  }, [cloud]);

  // Camera requests (presets / focus tree). Focusing from walk mode switches back to orbit first.
  useEffect(() => {
    if (!request) return;
    const store = useViewerStore.getState();
    if (store.cameraMode === 'walk') store.setCameraMode('orbit');
    const pose = poseFor(request, cloud, treesById, camera);
    store.consumeCameraRequest();
    if (pose) requestAnimationFrame(() => startTransition(pose.position, pose.target));
  });

  // Returning to orbit from walk: put the pivot a few metres ahead of the eye.
  const prevMode = useRef(cameraMode);
  useEffect(() => {
    if (prevMode.current === 'walk' && cameraMode === 'orbit' && controls.current) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      controls.current.target.copy(camera.position).addScaledVector(dir, 6);
      controls.current.update();
    }
    prevMode.current = cameraMode;
  }, [cameraMode, camera]);

  // Double-click: re-centre the orbit pivot on the clicked point (CloudCompare-style).
  useEffect(() => {
    const onDbl = (e: MouseEvent) => {
      if (useViewerStore.getState().cameraMode !== 'orbit' || !controls.current) return;
      const r = dom.getBoundingClientRect();
      const ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ndcY = -((e.clientY - r.top) / r.height) * 2 + 1;
      const hit = pickPoint(cloud, camera, ndcX, ndcY, r.width, r.height);
      if (!hit) return;
      const offset = camera.position.clone().sub(controls.current.target);
      startTransition(hit.clone().add(offset.multiplyScalar(0.6)), hit, 0.6);
    };
    dom.addEventListener('dblclick', onDbl);
    return () => dom.removeEventListener('dblclick', onDbl);
  });

  useFrame((_, dt) => {
    const tr = transition.current;
    const c = controls.current;
    if (!tr || !c) return;
    tr.t = Math.min(1, tr.t + dt / tr.duration);
    const k = ease(tr.t);
    camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
    c.target.lerpVectors(tr.fromTarget, tr.toTarget, k);
    c.update();
    if (tr.t >= 1) transition.current = null;
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={cameraMode === 'orbit'}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.7}
        zoomSpeed={0.9}
        maxPolarAngle={Math.PI * 0.53}
        minDistance={0.5}
        maxDistance={600}
      />
      {cameraMode === 'walk' && <WalkControls />}
    </>
  );
}
