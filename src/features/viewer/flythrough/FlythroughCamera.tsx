/**
 * WS-F. Drives the camera while cameraMode === 'flythrough' (CameraController mounts it and disables
 * orbit/walk). Builds the flight from the current view when a preset starts, advances its own clock
 * while playing, honours seeks from the scrubber and highlights the featured tree on tour stops.
 * On exit the orbit pivot is left on the last look target, so orbiting continues from the final view.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {useGround} from '../core/ground';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {buildFlight, type Flight, sampleFlight} from './flights';
import {useFlythroughUi} from './flythroughUi';

export function FlythroughCamera() {
  const {cloud, trees} = usePlotData();
  const ground = useGround();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {target: THREE.Vector3; update: () => void} | null;
  const preset = useViewerStore((s) => s.flythrough.preset);
  const flight = useRef<Flight | null>(null);
  const time = useRef(0);
  const pos = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const lastProgress = useRef(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: build once per preset, from the view at that moment
  useEffect(() => {
    if (!preset) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const start = {
      pos: camera.position.clone(),
      target: controls?.target.clone() ?? camera.position.clone().addScaledVector(dir, 10),
    };
    const f = buildFlight(preset, {cloud, trees, ground, start});
    flight.current = f;
    time.current = 0;
    lookAt.current.copy(start.target);
    useFlythroughUi.setState({flight: f, treeId: null, seekTo: null});
    if (import.meta.env.DEV) {
      const clear = f.minStemClearanceM != null ? `, min stem clearance ${f.minStemClearanceM.toFixed(2)} m` : '';
      console.info(`[flythrough] ${preset}: ${f.duration.toFixed(1)} s, ${f.segments.length} segments${clear}`);
    }
  }, [preset]);

  // Leave the orbit pivot where the flight was looking.
  useEffect(
    () => () => {
      if (!controls) return;
      controls.target.copy(lookAt.current);
      controls.update();
    },
    [controls],
  );

  useFrame((_, dt) => {
    const f = flight.current;
    if (!f) return;
    const store = useViewerStore.getState();
    const ui = useFlythroughUi.getState();
    let snap = false;
    if (ui.seekTo != null) {
      time.current = Math.min(f.duration, Math.max(0, ui.seekTo));
      ui.seek(null);
      snap = true;
    } else if (store.flythrough.playing) {
      time.current = Math.min(f.duration, time.current + Math.min(dt, 0.1));
    }
    const treeId = sampleFlight(f, time.current, pos.current, target.current);

    // Light smoothing hides frame-time jitter; scrubbing snaps.
    const kp = snap ? 1 : 1 - Math.exp(-dt * 20);
    const kt = snap ? 1 : 1 - Math.exp(-dt * 10);
    camera.position.lerp(pos.current, kp);
    lookAt.current.lerp(target.current, kt);
    camera.lookAt(lookAt.current);

    if (treeId !== ui.treeId) {
      ui.setTreeId(treeId);
      store.selectTree(treeId);
    }
    const progress = f.duration > 0 ? time.current / f.duration : 1;
    if (Math.abs(progress - lastProgress.current) > 0.001 || (progress >= 1 && lastProgress.current < 1)) {
      lastProgress.current = progress;
      store.setFlythrough(progress >= 1 ? {progress: 1, playing: false} : {progress});
    }
  });

  return null;
}
