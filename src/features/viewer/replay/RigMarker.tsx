/**
 * WS-E. The capture rig at playback.t: backpack pole + lidar puck at sensor height, a heading cone and
 * the 15 m lidar range ring on the ground. Hidden in first person (we are the rig); instead this
 * component mounts the first-person camera.
 */
import {Line} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import type * as THREE from 'three';
import type {Trajectory} from '@/types';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {FirstPersonCamera} from './FirstPersonCamera';
import {useReplayUi} from './replayUi';
import {getPath, type Pose, poseAt} from './trajectoryPath';

const RANGE_M = 15;

export function RigMarker() {
  const {trajectory} = usePlotData();
  const enabled = useViewerStore((s) => s.playback.enabled);
  const firstPerson = useViewerStore((s) => s.cameraMode === 'follow');
  if (!trajectory || !enabled) return null;
  if (firstPerson) return <FirstPersonCamera trajectory={trajectory} />;
  return <Rig trajectory={trajectory} />;
}

function Rig({trajectory}: {trajectory: Trajectory}) {
  const path = useMemo(() => getPath(trajectory), [trajectory]);
  const group = useRef<THREE.Group>(null);
  const heading = useRef<THREE.Group>(null);
  const pose = useRef<Pose>({x: 0, y: 0, z: 0, yaw: 0});
  const h = path.sensorHeightM;
  // In the bird's-eye overview the rig is drawn over the canopy and a bit larger.
  const onTop = useReplayUi((s) => s.pathView);

  const ring = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push([Math.cos(a) * RANGE_M, Math.sin(a) * RANGE_M, 0.08]);
    }
    return pts;
  }, []);

  useFrame(() => {
    const p = poseAt(path, useViewerStore.getState().playback.t, pose.current);
    group.current?.position.set(p.x, p.y, p.z - h);
    heading.current?.rotation.set(0, 0, p.yaw);
  });

  return (
    <group ref={group} scale={onTop ? 1.6 : 1}>
      {/* pole + backpack */}
      <mesh position={[0, 0, h * 0.5]} rotation={[Math.PI / 2, 0, 0]} renderOrder={onTop ? 23 : 0}>
        <cylinderGeometry args={[0.035, 0.035, h, 8]} />
        <meshBasicMaterial color="#e7e9ee" depthTest={!onTop} />
      </mesh>
      <mesh position={[0, 0, h * 0.62]} rotation={[Math.PI / 2, 0, 0]} renderOrder={onTop ? 23 : 0}>
        <boxGeometry args={[0.32, 0.45, 0.2]} />
        <meshBasicMaterial color="#2f9c5a" depthTest={!onTop} />
      </mesh>
      {/* lidar puck */}
      <mesh position={[0, 0, h + 0.05]} rotation={[Math.PI / 2, 0, 0]} renderOrder={onTop ? 23 : 0}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 20]} />
        <meshBasicMaterial color="#f57e26" depthTest={!onTop} />
      </mesh>
      <group ref={heading}>
        {/* view cone: apex at the rig, opening along +X (then rotated by yaw) */}
        <mesh position={[0.9, 0, h]} rotation={[0, 0, Math.PI / 2]} renderOrder={onTop ? 23 : 0}>
          <coneGeometry args={[0.45, 1.4, 24, 1, true]} />
          <meshBasicMaterial
            color="#f57e26"
            transparent
            opacity={0.28}
            depthWrite={false}
            depthTest={!onTop}
            side={2}
          />
        </mesh>
      </group>
      <Line
        depthTest={!onTop}
        renderOrder={onTop ? 21 : 0}
        points={ring}
        color="#f57e26"
        lineWidth={1.5}
        dashed
        dashSize={0.6}
        gapSize={0.4}
        transparent
        opacity={0.7}
      />
    </group>
  );
}
