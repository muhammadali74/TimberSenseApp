/**
 * WS-B owns. Phase 0: orbit around the plot centre.
 * WS-B adds: walk mode, view presets, `cameraRequest` handling, and hands off to
 * flythrough (WS-F) / follow (WS-E) controllers based on `cameraMode`.
 */
import {OrbitControls} from '@react-three/drei';
import {usePlotData} from '../PlotDataContext';

export function CameraController() {
  const {cloud} = usePlotData();
  const {min, max} = cloud.header.bbox;
  const targetZ = Math.max(0, (max[2] - min[2]) * 0.25);
  return <OrbitControls makeDefault enableDamping dampingFactor={0.12} target={[0, 0, targetZ]} />;
}
