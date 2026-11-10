/**
 * WS-B. First-person walk: WASD/arrows to move, drag to look, Shift to run, Esc back to orbit.
 * Eye height follows the terrain.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {useViewerStore} from '../store';
import {useGround} from './ground';

export const EYE_HEIGHT_M = 1.7;
const WALK_SPEED = 1.6; // m/s
const RUN_SPEED = 4.5;

export function WalkControls() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const ground = useGround();
  const keys = useRef(new Set<string>());
  const look = useRef({yaw: 0, pitch: 0});
  const pos = useRef(new THREE.Vector3());

  // Start a few metres behind where the orbit view was looking (its pivot), at eye height, keeping the
  // horizontal heading — so the trees you were looking at are in front of you.
  const controls = useThree((s) => s.controls) as unknown as {target?: THREE.Vector3} | null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialise once when walk mode starts
  useEffect(() => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pivot = controls?.target ?? new THREE.Vector3();
    const back = new THREE.Vector3(dir.x, dir.y, 0).normalize().multiplyScalar(-4);
    const start = pivot.clone().add(back);
    pos.current.set(start.x, start.y, ground.heightAt(start.x, start.y) + EYE_HEIGHT_M);
    look.current = {yaw: Math.atan2(dir.y, dir.x), pitch: -0.08};
  }, [camera, ground]);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest('input, textarea, select');
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (e.key === 'Escape') useViewerStore.getState().setCameraMode('orbit');
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    let dragging = false;
    const md = () => {
      dragging = true;
    };
    const mu = () => {
      dragging = false;
    };
    const mm = (e: PointerEvent) => {
      if (!dragging) return;
      look.current.yaw -= e.movementX * 0.0035;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - e.movementY * 0.0035, -1.3, 1.3);
    };
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    dom.addEventListener('pointerdown', md);
    window.addEventListener('pointerup', mu);
    window.addEventListener('pointermove', mm);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      dom.removeEventListener('pointerdown', md);
      window.removeEventListener('pointerup', mu);
      window.removeEventListener('pointermove', mm);
    };
  }, [dom]);

  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const k = keys.current;
    const {yaw, pitch} = look.current;
    fwd.current.set(Math.cos(yaw), Math.sin(yaw), 0);
    right.current.set(Math.sin(yaw), -Math.cos(yaw), 0);
    const speed = (k.has('shift') ? RUN_SPEED : WALK_SPEED) * Math.min(dt, 0.1);
    const p = pos.current;
    if (k.has('w') || k.has('arrowup')) p.addScaledVector(fwd.current, speed);
    if (k.has('s') || k.has('arrowdown')) p.addScaledVector(fwd.current, -speed);
    if (k.has('d') || k.has('arrowright')) p.addScaledVector(right.current, speed);
    if (k.has('a') || k.has('arrowleft')) p.addScaledVector(right.current, -speed);
    const groundZ = ground.heightAt(p.x, p.y) + EYE_HEIGHT_M;
    p.z += (groundZ - p.z) * Math.min(1, dt * 8);
    camera.position.copy(p);
    camera.lookAt(p.x + Math.cos(yaw) * Math.cos(pitch), p.y + Math.sin(yaw) * Math.cos(pitch), p.z + Math.sin(pitch));
  });

  return null;
}
