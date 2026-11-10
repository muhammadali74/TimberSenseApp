/**
 * Contract §5.7 — viewer store. The ONLY channel between viewer workstreams (B–F).
 * Changes to this file go through a contract PR (see PLAN.md §9).
 */
import {create} from 'zustand';

export type ColorMode = 'rgb' | 'instance' | 'semantic' | 'height' | 'metric';
export type MetricKey = 'dbh' | 'height' | 'volume';
export type CameraMode = 'orbit' | 'walk' | 'flythrough' | 'follow';
export type ViewPreset = 'reset' | 'top' | 'side';
export type FlythroughPreset = 'orbit' | 'walk' | 'tour';
export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export type CameraRequest = {kind: 'focusTree'; id: number} | {kind: 'view'; view: ViewPreset};

export interface RenderSettings {
  edl: boolean;
  edlStrength: number;
  edlRadius: number;
  pointSize: number;
  sizeMode: 'fixed' | 'adaptive';
  background: 'sky' | 'dark' | 'light';
  showDtm: boolean;
  /** degrees */
  sunAzimuth: number;
  /** degrees */
  sunElevation: number;
}

export interface LayerToggles {
  markers: boolean;
  trajectory: boolean;
  qsm: boolean;
  labels: boolean;
}

export interface PlaybackState {
  enabled: boolean;
  /** seconds since trajectory start */
  t: number;
  playing: boolean;
  speed: PlaybackSpeed;
  /** progressive "live capture" reveal of the cloud (drives uRevealT) */
  reveal: boolean;
}

export interface FlythroughState {
  preset: FlythroughPreset | null;
  playing: boolean;
  /** 0..1 */
  progress: number;
}

export interface ViewerState {
  colorMode: ColorMode;
  metric: MetricKey;
  render: RenderSettings;
  layers: LayerToggles;
  hoveredTreeId: number | null;
  selectedTreeId: number | null;
  dimOthers: boolean;
  cameraMode: CameraMode;
  cameraRequest: CameraRequest | null;
  playback: PlaybackState;
  flythrough: FlythroughState;
}

export interface ViewerActions {
  setColorMode: (mode: ColorMode) => void;
  setMetric: (metric: MetricKey) => void;
  setRender: (patch: Partial<RenderSettings>) => void;
  setLayers: (patch: Partial<LayerToggles>) => void;
  setDimOthers: (dim: boolean) => void;
  hoverTree: (id: number | null) => void;
  /** Selecting does not move the camera; call requestCamera({kind:'focusTree'}) for that. */
  selectTree: (id: number | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  requestCamera: (req: CameraRequest) => void;
  /** Called by CameraController once it has started handling the request. */
  consumeCameraRequest: () => void;
  setPlayback: (patch: Partial<PlaybackState>) => void;
  setFlythrough: (patch: Partial<FlythroughState>) => void;
  /** Reset everything — called when a different plot is opened. */
  reset: () => void;
}

export const initialViewerState: ViewerState = {
  colorMode: 'rgb',
  metric: 'dbh',
  render: {
    edl: true,
    edlStrength: 1.0,
    edlRadius: 1.4,
    pointSize: 2.0,
    sizeMode: 'adaptive',
    background: 'sky',
    showDtm: false,
    sunAzimuth: 135,
    sunElevation: 45,
  },
  layers: {markers: true, trajectory: false, qsm: false, labels: false},
  hoveredTreeId: null,
  selectedTreeId: null,
  dimOthers: true,
  cameraMode: 'orbit',
  cameraRequest: null,
  playback: {enabled: false, t: 0, playing: false, speed: 1, reveal: false},
  flythrough: {preset: null, playing: false, progress: 0},
};

export const useViewerStore = create<ViewerState & ViewerActions>()((set) => ({
  ...initialViewerState,
  setColorMode: (colorMode) => set({colorMode}),
  setMetric: (metric) => set({metric}),
  setRender: (patch) => set((s) => ({render: {...s.render, ...patch}})),
  setLayers: (patch) => set((s) => ({layers: {...s.layers, ...patch}})),
  setDimOthers: (dimOthers) => set({dimOthers}),
  hoverTree: (hoveredTreeId) => set({hoveredTreeId}),
  selectTree: (selectedTreeId) => set({selectedTreeId}),
  setCameraMode: (cameraMode) => set({cameraMode}),
  requestCamera: (cameraRequest) => set({cameraRequest}),
  consumeCameraRequest: () => set({cameraRequest: null}),
  setPlayback: (patch) => set((s) => ({playback: {...s.playback, ...patch}})),
  setFlythrough: (patch) => set((s) => ({flythrough: {...s.flythrough, ...patch}})),
  reset: () => set(initialViewerState),
}));
