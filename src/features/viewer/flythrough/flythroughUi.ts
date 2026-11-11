/**
 * WS-F. Feature-local state: the built flight (for the controls), the current featured tree, seek
 * requests from the scrubber, and recording. Shared viewer state (preset, playing, progress) stays in
 * the viewer store (§5.7).
 */
import {create} from 'zustand';
import {type FlythroughPreset, useViewerStore} from '../store';
import type {Flight} from './flights';

interface FlythroughUi {
  flight: Flight | null;
  /** tree featured right now (tour stop), or null */
  treeId: number | null;
  /** seconds; consumed by FlythroughCamera */
  seekTo: number | null;
  recording: boolean;
  setFlight: (flight: Flight | null) => void;
  setTreeId: (treeId: number | null) => void;
  seek: (t: number | null) => void;
  setRecording: (recording: boolean) => void;
}

export const useFlythroughUi = create<FlythroughUi>()((set) => ({
  flight: null,
  treeId: null,
  seekTo: null,
  recording: false,
  setFlight: (flight) => set({flight}),
  setTreeId: (treeId) => set({treeId}),
  seek: (seekTo) => set({seekTo}),
  setRecording: (recording) => set({recording}),
}));

export const PRESET_LABELS: Record<FlythroughPreset, string> = {
  orbit: 'Orbit plot',
  walk: 'Walk between trees',
  tour: 'Tree-by-tree tour',
};

/** Start a preset from wherever the camera is now. */
export function startFlythrough(preset: FlythroughPreset) {
  const v = useViewerStore.getState();
  if (v.playback.enabled) v.setPlayback({enabled: false, playing: false});
  v.selectTree(null);
  // Same preset again → restart it; a different preset is rebuilt from the current view.
  if (v.cameraMode === 'flythrough' && v.flythrough.preset === preset) useFlythroughUi.getState().seek(0);
  v.setFlythrough({preset, playing: true, progress: 0});
  v.setCameraMode('flythrough');
}

export function exitFlythrough() {
  const v = useViewerStore.getState();
  v.setFlythrough({preset: null, playing: false, progress: 0});
  if (v.cameraMode === 'flythrough') v.setCameraMode('orbit');
  if (useFlythroughUi.getState().treeId != null) v.selectTree(null);
  useFlythroughUi.setState({flight: null, treeId: null, seekTo: null});
}
