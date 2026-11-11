/**
 * WS-E. Capture path drawn on the ground: colour runs from teal (start) to orange (end), with
 * direction arrows and start/end pins. During replay the walked part is a bright trail and the part
 * still ahead is a faint dashed line (visible in first person as the path in front of you).
 */
import {Html, Line} from '@react-three/drei';
import {useMemo} from 'react';
import * as THREE from 'three';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {PATH_END, PATH_START, pathColor} from './pathColors';
import {useReplayUi} from './replayUi';
import {getPath, indexAt, type TrajectoryPath} from './trajectoryPath';

const GROUND_LIFT_M = 0.06;
const ARROW_EVERY_M = 2.5;

/** Path points on the ground (trajectory Z minus sensor height). */
function groundPoints(path: TrajectoryPath, step = 2): {pts: THREE.Vector3[]; idx: number[]} {
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  const n = path.t.length;
  for (let i = 0; i < n; i += step) {
    pts.push(new THREE.Vector3(path.x[i], path.y[i], path.z[i] - path.sensorHeightM + GROUND_LIFT_M));
    idx.push(i);
  }
  if (idx[idx.length - 1] !== n - 1) {
    pts.push(new THREE.Vector3(path.x[n - 1], path.y[n - 1], path.z[n - 1] - path.sensorHeightM + GROUND_LIFT_M));
    idx.push(n - 1);
  }
  return {pts, idx};
}

export function TrajectoryLayer() {
  const {trajectory} = usePlotData();
  const show = useViewerStore((s) => s.layers.trajectory || s.playback.enabled);
  if (!trajectory || !show) return null;
  return <TrajectoryPathView path={getPath(trajectory)} />;
}

function TrajectoryPathView({path}: {path: TrajectoryPath}) {
  const replaying = useViewerStore((s) => s.playback.enabled);
  const firstPerson = useViewerStore((s) => s.cameraMode === 'follow');
  // Bird's-eye overview: draw the path over the canopy, thicker, with bigger arrows and pins.
  const onTop = useReplayUi((s) => s.pathView);
  const order = onTop ? 20 : 8;
  const arrowScale = onTop ? 2.6 : 1;
  let walkedWidth = replaying ? 4 : 3;
  if (onTop) walkedWidth = 5;
  // Re-render the trail only when we pass a new sample (10 Hz), not every frame.
  const sampleIdx = useViewerStore((s) => (s.playback.enabled ? indexAt(path, s.playback.t) : -1));

  const {pts, idx, colors, arrows} = useMemo(() => {
    const {pts, idx} = groundPoints(path);
    const last = path.t.length - 1;
    const colors = idx.map((i) => pathColor(i / last));
    const arrows: {pos: THREE.Vector3; yaw: number; color: THREE.Color}[] = [];
    for (let k = 1, next = ARROW_EVERY_M; k < idx.length - 1; k++) {
      if (path.dist[idx[k]] < next) continue;
      next = path.dist[idx[k]] + ARROW_EVERY_M;
      const d = pts[k + 1].clone().sub(pts[k - 1]);
      arrows.push({pos: pts[k], yaw: Math.atan2(d.y, d.x), color: colors[k]});
    }
    return {pts, idx, colors, arrows};
  }, [path]);

  // Split into walked / ahead at the current sample.
  const split = replaying
    ? Math.max(
        1,
        idx.findIndex((i) => i > sampleIdx),
      )
    : -1;
  const walked = split > 0 ? pts.slice(0, split) : pts;
  const walkedColors = split > 0 ? colors.slice(0, split) : colors;
  const ahead = split > 0 ? pts.slice(split - 1) : null;

  return (
    <group>
      {onTop && (
        // dark casing under the coloured path so it reads against green ground from above
        <Line
          points={pts}
          color="#0a0d12"
          lineWidth={9}
          transparent
          opacity={0.45}
          depthTest={false}
          renderOrder={order - 1}
        />
      )}
      {walked.length >= 2 && (
        <Line
          points={walked}
          vertexColors={walkedColors}
          lineWidth={walkedWidth}
          depthTest={!onTop}
          renderOrder={order}
        />
      )}
      {ahead && ahead.length >= 2 && (
        <Line
          points={ahead}
          color="#ffffff"
          lineWidth={onTop ? 3 : 2}
          dashed
          dashSize={onTop ? 0.6 : 0.3}
          gapSize={onTop ? 0.4 : 0.2}
          transparent
          opacity={onTop ? 0.8 : 0.55}
          depthTest={!onTop}
          renderOrder={order}
        />
      )}
      {arrows.map((a) => (
        <mesh
          key={`${a.pos.x},${a.pos.y}`}
          position={a.pos}
          rotation={[0, 0, a.yaw - Math.PI / 2]}
          scale={arrowScale}
          renderOrder={order + 1}
        >
          <coneGeometry args={[0.12, 0.32, 3]} />
          <meshBasicMaterial color={a.color} depthTest={!onTop} />
        </mesh>
      ))}
      {!firstPerson && (
        <>
          <PathPin position={pts[0]} color={PATH_START} label="Start" onTop={onTop} />
          <PathPin position={pts[pts.length - 1]} color={PATH_END} label="End" onTop={onTop} />
        </>
      )}
    </group>
  );
}

function PathPin({
  position,
  color,
  label,
  onTop,
}: {
  position: THREE.Vector3;
  color: string;
  label: string;
  onTop: boolean;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} renderOrder={onTop ? 22 : 0}>
        <cylinderGeometry args={[0.025, 0.025, 1, 6]} />
        <meshBasicMaterial color={color} depthTest={!onTop} />
      </mesh>
      <mesh position={[0, 0, 1]} scale={onTop ? 2.2 : 1} renderOrder={onTop ? 22 : 0}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color={color} depthTest={!onTop} />
      </mesh>
      <Html position={[0, 0, 1.25]} center zIndexRange={[5, 0]} style={{pointerEvents: 'none'}}>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow"
          style={{background: color}}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}
