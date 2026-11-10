/**
 * WS-C. Hover / click picking of trees.
 *  - hover → hoverTree(id) + tooltip, pointer cursor
 *  - click (no drag) → selectTree(id); the camera focuses after a short delay so a
 *    double-click (pivot re-centre, WS-B) can cancel it
 *  - click on empty space or Esc → clear selection
 * Disabled during flythrough / follow camera modes.
 */
import {useThree} from '@react-three/fiber';
import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {buildProxies, pickTree} from './pick';
import {TreeTooltip} from './TreeTooltip';

const CLICK_MAX_MOVE_PX = 5;
const CLICK_MAX_MS = 450;
const FOCUS_DELAY_MS = 260;

export function TreePicker() {
  const {trees} = usePlotData();
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const proxies = useMemo(() => buildProxies(trees), [trees]);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let frame = 0;
    let last: PointerEvent | null = null;
    let down: {x: number; y: number; t: number} | null = null;
    let focusTimer = 0;

    const pickAt = (e: MouseEvent) => {
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return pickTree(raycaster.ray, proxies);
    };
    const active = () => {
      const m = useViewerStore.getState().cameraMode;
      return m === 'orbit' || m === 'walk';
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!last || down || !active()) return;
        const hit = pickAt(last);
        const id = hit?.id ?? null;
        if (useViewerStore.getState().hoveredTreeId !== id) useViewerStore.getState().hoverTree(id);
        dom.style.cursor = id != null ? 'pointer' : '';
      });
    };
    const onLeave = () => {
      useViewerStore.getState().hoverTree(null);
      dom.style.cursor = '';
    };
    const onDown = (e: PointerEvent) => {
      if (e.button === 0) down = {x: e.clientX, y: e.clientY, t: performance.now()};
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || e.button !== 0 || !active()) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (moved > CLICK_MAX_MOVE_PX || performance.now() - d.t > CLICK_MAX_MS) return;
      const hit = pickAt(e);
      const store = useViewerStore.getState();
      if (!hit) {
        if (store.cameraMode === 'orbit') store.selectTree(null);
        return;
      }
      store.selectTree(hit.id);
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (useViewerStore.getState().selectedTreeId === hit.id) {
          useViewerStore.getState().requestCamera({kind: 'focusTree', id: hit.id});
        }
      }, FOCUS_DELAY_MS);
    };
    const onDbl = () => window.clearTimeout(focusTimer);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement)?.closest('input, textarea, select')) return;
      const s = useViewerStore.getState();
      if (s.cameraMode === 'orbit' && s.selectedTreeId != null) s.selectTree(null);
    };

    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerleave', onLeave);
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('dblclick', onDbl);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerleave', onLeave);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('dblclick', onDbl);
      window.removeEventListener('keydown', onKey);
      dom.style.cursor = '';
    };
  }, [camera, dom, proxies]);

  return <TreeTooltip />;
}
