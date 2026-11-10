/**
 * WS-B owns. Phase 0: plain R3F canvas, Z-up perspective camera framing the plot bbox.
 * Scene convention (§5.1): metres, Z-up, origin at plot centre on the ground.
 */
import {Canvas} from '@react-three/fiber';
import type {ReactNode} from 'react';
import {usePlotData} from '../PlotDataContext';

export function ViewerCanvas({children}: {children: ReactNode}) {
  const {cloud} = usePlotData();
  const {min, max} = cloud.header.bbox;
  const span = Math.max(max[0] - min[0], max[1] - min[1]);
  return (
    <div className="viewer-canvas-bg absolute inset-0">
      <Canvas
        camera={{fov: 55, near: 0.05, far: 5000, up: [0, 0, 1], position: [span * 0.9, -span * 0.9, span * 0.6]}}
        gl={{antialias: false, powerPreference: 'high-performance'}}
        dpr={[1, 2]}
      >
        {children}
      </Canvas>
    </div>
  );
}
