/**
 * WS-B. R3F canvas. Scene convention (§5.1): metres, Z-up, origin at plot centre on the ground.
 * Colour management is manual: everything renders linear into EdlPass's target, which outputs sRGB.
 * Add `?stats` to the URL for an FPS meter.
 */
import {Stats} from '@react-three/drei';
import {Canvas, useThree} from '@react-three/fiber';
import type {ReactNode} from 'react';
import * as THREE from 'three';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {sunDirectionWorld} from './EdlPass';

/** Initial "home" camera pose for a plot bbox — shared with CameraController's reset view. */
export function homePose(bbox: {min: number[]; max: number[]}) {
  const span = Math.max(bbox.max[0] - bbox.min[0], bbox.max[1] - bbox.min[1], 4);
  const targetZ = Math.max(0, (bbox.max[2] - bbox.min[2]) * 0.25);
  return {
    position: new THREE.Vector3(span * 0.75, -span * 0.75, targetZ + span * 0.45),
    target: new THREE.Vector3(0, 0, targetZ),
  };
}

function SceneLights() {
  const az = useViewerStore((s) => s.render.sunAzimuth);
  const el = useViewerStore((s) => s.render.sunElevation);
  const dir = sunDirectionWorld(az, el).multiplyScalar(50);
  return (
    <>
      <hemisphereLight args={[0xdfeaf2, 0x4a5a3a, 1.1]} position={[0, 0, 1]} />
      <directionalLight position={dir} intensity={1.6} />
    </>
  );
}

// Dev-only handle for debugging and screenshot scripts: window.__viewerStore.getState()/setState().
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as {__viewerStore: typeof useViewerStore}).__viewerStore = useViewerStore;
}

function CameraSetup() {
  const camera = useThree((s) => s.camera);
  camera.up.set(0, 0, 1);
  return null;
}

export function ViewerCanvas({children}: {children: ReactNode}) {
  const {cloud} = usePlotData();
  const home = homePose(cloud.header.bbox);
  const showStats = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('stats');
  return (
    <div className="viewer-canvas-bg absolute inset-0">
      <Canvas
        flat
        camera={{fov: 55, near: 0.05, far: 2000, up: [0, 0, 1], position: home.position.toArray()}}
        gl={{antialias: false, powerPreference: 'high-performance', outputColorSpace: THREE.SRGBColorSpace}}
        dpr={[1, 2]}
      >
        <CameraSetup />
        <SceneLights />
        {children}
        {showStats && <Stats className="!left-auto !right-2 !top-2" />}
      </Canvas>
    </div>
  );
}
