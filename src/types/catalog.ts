/**
 * Contract §5.6 — hard-coded projects → blocks → plots catalog (data in src/data/catalog.ts).
 * Coordinates are WGS84 [lon, lat].
 */
import type {PlotSummary} from './plot';

export type LonLat = [lon: number, lat: number];

export type ProjectStatus = 'active' | 'planned' | 'completed';
export type BlockStatus = 'cruised' | 'in_progress' | 'pending';
export type PlotStatus = 'processed' | 'captured' | 'pending';

export interface PlotRef {
  id: string;
  name: string;
  center: LonLat;
  status: PlotStatus;
  captureDate?: string;
  /** Only real plots, e.g. '/data/plots/fariy_1_test'. */
  dataPath?: string;
  /** Real plots get this from plot.json at load time; dummy plots carry generated numbers. */
  summary?: PlotSummary;
}

export interface Block {
  id: string;
  name: string;
  status: BlockStatus;
  polygon: LonLat[];
  areaHa: number;
  plots: PlotRef[];
}

export interface Project {
  id: string;
  name: string;
  client: string;
  region: string;
  country: string;
  status: ProjectStatus;
  center: LonLat;
  areaHa: number;
  lastCapture?: string;
  species: string[];
  targets: {sph: number; minDbhCm: number};
  blocks: Block[];
}
