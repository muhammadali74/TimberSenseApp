/**
 * WS-E local UI state (not part of the shared viewer store contract): calibration of the
 * first-person camera against the front video, video quality, and the picture-in-picture window.
 * Calibration is remembered per plot in localStorage (best effort).
 */
import {create} from 'zustand';
import type {CameraPosition} from '@/types';

export interface Calibration {
  /** Added on top of trajectory.videoOffsetS: video t = traj t + videoOffsetS + timeOffsetS */
  timeOffsetS: number;
  headingOffsetDeg: number;
  pitchDeg: number;
  /** Horizontal field of view of the front camera. */
  hfovDeg: number;
  heightOffsetM: number;
}

export const DEFAULT_CALIBRATION: Calibration = {
  timeOffsetS: 0,
  headingOffsetDeg: 0,
  pitchDeg: -6,
  hfovDeg: 95,
  heightOffsetM: 0,
};

export type VideoQuality = 'auto' | 2160 | 1080 | 720;
export type PipSize = 's' | 'm' | 'l';
export type PipCorner = 'tl' | 'tr' | 'bl' | 'br';

interface ReplayUiState {
  plotId: string | null;
  calibration: Calibration;
  quality: VideoQuality;
  pipVisible: boolean;
  pipSize: PipSize;
  pipCorner: PipCorner;
  pipExpanded: boolean;
  pipCamera: CameraPosition;
  /** Free-look offset added to the walking direction (radians); eases back to 0 while playing. */
  look: {yaw: number; pitch: number};
  /** Set by CameraFeeds: what is actually playing, for display. */
  activeRendition: string | null;

  loadForPlot: (plotId: string) => void;
  setCalibration: (patch: Partial<Calibration>) => void;
  resetCalibration: () => void;
  setQuality: (q: VideoQuality) => void;
  setPip: (
    patch: Partial<Pick<ReplayUiState, 'pipVisible' | 'pipSize' | 'pipCorner' | 'pipExpanded' | 'pipCamera'>>,
  ) => void;
  setActiveRendition: (label: string | null) => void;
}

const key = (plotId: string) => `timbersense.replay.calibration.${plotId}`;

function readCalibration(plotId: string): Calibration {
  try {
    const raw = localStorage.getItem(key(plotId));
    if (raw) return {...DEFAULT_CALIBRATION, ...(JSON.parse(raw) as Partial<Calibration>)};
  } catch {
    /* storage unavailable — use defaults */
  }
  return {...DEFAULT_CALIBRATION};
}

function writeCalibration(plotId: string | null, c: Calibration) {
  if (!plotId) return;
  try {
    localStorage.setItem(key(plotId), JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export const useReplayUi = create<ReplayUiState>()((set, get) => ({
  plotId: null,
  calibration: {...DEFAULT_CALIBRATION},
  quality: 'auto',
  pipVisible: true,
  pipSize: 'm',
  pipCorner: 'br',
  pipExpanded: false,
  pipCamera: 'front',
  look: {yaw: 0, pitch: 0},
  activeRendition: null,

  loadForPlot: (plotId) => set({plotId, calibration: readCalibration(plotId), look: {yaw: 0, pitch: 0}}),
  setCalibration: (patch) => {
    const calibration = {...get().calibration, ...patch};
    writeCalibration(get().plotId, calibration);
    set({calibration});
  },
  resetCalibration: () => {
    writeCalibration(get().plotId, DEFAULT_CALIBRATION);
    set({calibration: {...DEFAULT_CALIBRATION}});
  },
  setQuality: (quality) => set({quality}),
  setPip: (patch) => set(patch),
  setActiveRendition: (activeRendition) => set({activeRendition}),
}));
