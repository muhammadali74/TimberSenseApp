/**
 * Hard-coded catalog (contract §5.6). Phase 0 stub — WS-H expands this to the full set of
 * projects/blocks/plots (Kotli Sattian + 3 British Columbia dummies).
 *
 * Real plots: `dataPath` points at public/data/plots/<id>/ and `summary` mirrors that plot's plot.json
 * so aggregation stays synchronous.
 */
import type {PlotSummary, Project} from '@/types';

/** From testdata/fariy_1_test/plot_summary.json (carbon = 0.5 × biomass, CO2e = 3.667 × carbon). */
export const FARIY_1_TEST_SUMMARY: PlotSummary = {
  plotAreaM2: 452.34,
  nInstances: 40,
  nValidTrees: 29,
  nRejected: 11,
  stemsPerHa: 641.1,
  dbhCmMean: 30.13,
  dbhCmMedian: 28.87,
  dbhCmMin: 18.47,
  dbhCmMax: 42.24,
  quadraticMeanDbhCm: 31.04,
  heightMMean: 5.35,
  heightMMax: 7.46,
  basalAreaM2: 2.195,
  basalAreaM2PerHa: 48.53,
  woodVolumeM3: 6.013,
  woodVolumeM3PerHa: 132.93,
  biomassT: 3.006,
  biomassTPerHa: 66.46,
  carbonT: 1.503,
  co2eT: 5.512,
  nSpacingConflictTrees: 23,
  nThinningRemove: 12,
};

/** Kotli Sattian, Murree Hills, Punjab — approximate; replace with the plot's GPS fix when available. */
const KS_CENTER: [number, number] = [73.5235, 33.8085];

export const catalog: Project[] = [
  {
    id: 'kotli-sattian',
    name: 'Kotli Sattian Pine Cruise',
    client: 'Punjab Forest Department',
    region: 'Murree Hills, Punjab',
    country: 'Pakistan',
    status: 'active',
    center: KS_CENTER,
    areaHa: 18.4,
    lastCapture: '2026-09-30',
    species: ['Chir pine'],
    targets: {sph: 600, minDbhCm: 15},
    blocks: [
      {
        id: 'ks-b01',
        name: 'KS-B01 Fairy Ridge',
        status: 'in_progress',
        areaHa: 4.2,
        polygon: [
          [73.5218, 33.8098],
          [73.5251, 33.8102],
          [73.5262, 33.8079],
          [73.5236, 33.8066],
          [73.5212, 33.8077],
          [73.5218, 33.8098],
        ],
        plots: [
          {
            id: 'fariy_1_test',
            name: 'Plot FR-01',
            center: [73.5237, 33.8086],
            status: 'processed',
            captureDate: '2026-09-30T16:28:35+05:00',
            dataPath: '/data/plots/fariy_1_test',
            summary: FARIY_1_TEST_SUMMARY,
          },
          {
            id: 'sample',
            name: 'Plot FR-01 (sample, 300k pts)',
            center: [73.5229, 33.8091],
            status: 'captured',
            captureDate: '2026-09-30T16:28:35+05:00',
            dataPath: '/data/plots/sample',
          },
        ],
      },
    ],
  },
  {
    id: 'bc-southern-interior',
    name: 'Okanagan Highlands Restock Survey',
    client: 'Tolko Industries',
    region: 'Southern Interior, BC',
    country: 'Canada',
    status: 'planned',
    center: [-119.35, 49.95],
    areaHa: 126.0,
    species: ['Douglas-fir', 'Lodgepole pine'],
    targets: {sph: 1200, minDbhCm: 7.5},
    blocks: [
      {
        id: 'si-b01',
        name: 'A18667/216/LV4357',
        status: 'pending',
        areaHa: 12.6,
        polygon: [
          [-119.358, 49.954],
          [-119.343, 49.956],
          [-119.339, 49.947],
          [-119.352, 49.944],
          [-119.358, 49.954],
        ],
        plots: [{id: 'si-b01-p01', name: 'Plot 1', center: [-119.349, 49.951], status: 'pending'}],
      },
    ],
  },
];
