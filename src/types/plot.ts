/**
 * Contract §5.2 — plot manifest (`public/data/plots/<id>/plot.json`).
 * Produced by tools/prepare_plot.py (WS-A); consumed by the viewer and catalog loaders.
 */

/** camelCase version of the pipeline's plot_summary.json, plus carbon fields. */
export interface PlotSummary {
  plotAreaM2: number;
  nInstances: number;
  nValidTrees: number;
  nRejected: number;
  stemsPerHa: number;
  dbhCmMean: number;
  dbhCmMedian: number;
  dbhCmMin: number;
  dbhCmMax: number;
  quadraticMeanDbhCm: number;
  heightMMean: number;
  heightMMax: number;
  basalAreaM2: number;
  basalAreaM2PerHa: number;
  woodVolumeM3: number;
  woodVolumeM3PerHa: number;
  biomassT: number;
  biomassTPerHa: number;
  /** carbon = 0.5 × biomass */
  carbonT: number;
  /** CO2e = 3.667 × carbon */
  co2eT: number;
  nSpacingConflictTrees: number;
  nThinningRemove: number;
}

export type CameraPosition = 'front' | 'left' | 'right' | 'back';

/** One encoding of a camera video. Listed best-first in `files.videoRenditions` (WS-E picks what the browser can decode). */
export interface VideoRendition {
  /** Relative to the plot directory. */
  src: string;
  codec: 'hevc' | 'h264';
  width: number;
  height: number;
}

export interface PlotManifest {
  id: string;
  name: string;
  /** ISO 8601 */
  captureDate: string;
  device: string;
  operator: string;
  species: string[];
  geo: {
    lat: number;
    lon: number;
    /** WGS84 [lon, lat] ring */
    boundary?: [number, number][];
  };
  /** Subtracted from source coordinates to get the plot frame (§5.1). */
  offset: [number, number, number];
  /** Paths are relative to the plot directory. */
  files: {
    cloud: string;
    trees: string;
    trajectory?: string;
    dtm?: string;
    /** A missing camera is rendered as "Camera offline". */
    video?: Partial<Record<CameraPosition, string>>;
    /** Optional higher-quality renditions (e.g. 4K HEVC + 4K/1080p/720p H.264), best first. `video` stays the fallback. */
    videoRenditions?: Partial<Record<CameraPosition, VideoRendition[]>>;
    /** e.g. { hist_dbh_cm: 'media/hist_dbh_cm.png' } */
    charts?: Record<string, string>;
  };
  summary: PlotSummary;
}
