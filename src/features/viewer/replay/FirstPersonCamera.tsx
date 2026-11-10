/**
 * WS-E. First-person replay camera (cameraMode 'follow'): walks the point cloud along the capture
 * trajectory at playback.t, looking where the operator walked, with a field of view matched to the
 * front camera so the 3D view lines up with the video.
 * Drag to look around; while playing the view eases back to the walking direction.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import type {Trajectory} from '@/types';
import {useViewerStore} from '../store';
import {useReplayUi} from './replayUi';
import {getPath, type Pose, poseAt} from './trajectoryPath';

const SNAP_DIST_M = 1.5; // farther than this (a seek) → jump instead of gliding
const LOOK_RETURN_RATE = 1.6; // 1/s, how fast free-look eases back while playing

export function FirstPersonCamera({trajectory}: {trajectory: Trajectory}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useThree((s) => s.controls) as unknown as {target: THREE.Vector3; update: () => void} | null;
  const path = useMemo(() => getPath(trajectory), [trajectory]);
  const pose = useRef<Pose>({x: 0, y: 0, z: 0, yaw: 0});
  const pos = useRef<THREE.Vector3 | null>(null);
  const dragging = useRef(false);

  // Take over the camera while in first person; on exit restore the FOV and the overview pose the
  // user had before entering (so leaving first person lands back where they were).
  useEffect(() => {
    const savedFov = camera.fov;
    const savedPos = camera.position.clone();
    const savedTarget = controls?.target?.clone();
    return () => {
      camera.fov = savedFov;
      camera.updateProjectionMatrix();
      camera.position.copy(savedPos);
      if (controls?.target && savedTarget) {
        controls.target.copy(savedTarget);
        controls.update();
      }
      useReplayUi.setState({look: {yaw: 0, pitch: 0}});
    };
  }, [camera, controls]);

  // Drag to look around.
  useEffect(() => {
    const down = () => {
      dragging.current = true;
    };
    const up = () => {
      dragging.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const {look} = useReplayUi.getState();
      useReplayUi.setState({
        look: {
          yaw: look.yaw - e.movementX * 0.0035,
          pitch: THREE.MathUtils.clamp(look.pitch - e.movementY * 0.0035, -1.2, 1.2),
        },
      });
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
    };
  }, [dom]);

  useFrame((_, dt) => {
    const {playback} = useViewerStore.getState();
    const ui = useReplayUi.getState();
    const cal = ui.calibration;

    // Field of view: match the video's horizontal FOV on this canvas' aspect.
    const aspect = size.width / Math.max(1, size.height);
    const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cal.hfovDeg) / 2) / aspect));
    if (Math.abs(camera.fov - vfov) > 0.01) {
      camera.fov = vfov;
      camera.updateProjectionMatrix();
    }

    const p = poseAt(path, playback.t, pose.current);
    const target = new THREE.Vector3(p.x, p.y, p.z + cal.heightOffsetM);
    if (!pos.current || pos.current.distanceTo(target) > SNAP_DIST_M) pos.current = target.clone();
    else pos.current.lerp(target, 1 - Math.exp(-dt * 20));

    // Free look eases back to the walking direction while playing.
    let {yaw: lookYaw, pitch: lookPitch} = ui.look;
    if (playback.playing && !dragging.current && (lookYaw || lookPitch)) {
      const k = Math.exp(-dt * LOOK_RETURN_RATE);
      lookYaw = Math.abs(lookYaw * k) < 1e-3 ? 0 : lookYaw * k;
      lookPitch = Math.abs(lookPitch * k) < 1e-3 ? 0 : lookPitch * k;
      useReplayUi.setState({look: {yaw: lookYaw, pitch: lookPitch}});
    }

    const yaw = p.yaw + THREE.MathUtils.degToRad(cal.headingOffsetDeg) + lookYaw;
    const pitch = THREE.MathUtils.degToRad(cal.pitchDeg) + lookPitch;
    const e = pos.current;
    camera.position.copy(e);
    camera.lookAt(e.x + Math.cos(yaw) * Math.cos(pitch), e.y + Math.sin(yaw) * Math.cos(pitch), e.z + Math.sin(pitch));
  });

  return null;
}
