/**
 * Hard-coded catalog (contract §5.6), owned by WS-H.
 *
 * One functional project (Kotli Sattian, with the real captured plot FR-01) and three British Columbia
 * demo projects. Blocks and plots are generated deterministically (src/data/generate.ts).
 * Real plots: `dataPath` points at public/data/plots/<id>/ and `summary` mirrors that plot's plot.json
 * so aggregation stays synchronous.
 */
import type {LonLat, PlotSummary, Project} from '@/types';
import {type BlockSpec, makeBlock, PROFILES, type StandProfile} from './generate';

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

/** Plot FR-01 location (plot.json geo) — approximate until the GPS fix is confirmed. */
const FR01: LonLat = [73.5237, 33.8086];

function blocks(
  seed: number,
  center: LonLat,
  specs: BlockSpec[],
  profile: StandProfile,
  opts: {spacingM: number; captureMonth: string},
) {
  return specs.map((s, i) =>
    makeBlock(seed + i * 101, center, s, profile, {...opts, plotPrefix: s.id.toUpperCase().replace(/^[A-Z]+-/, '')}),
  );
}

// ── Kotli Sattian (functional) ──────────────────────────────────────────────
const KS_BLOCKS: BlockSpec[] = [
  {
    id: 'ks-b01',
    name: 'KS-B01 Fairy Ridge',
    status: 'in_progress',
    areaHa: 4.2,
    at: [0, 0],
    extraPlots: [
      {
        id: 'fariy_1_test',
        name: 'Plot FR-01',
        center: FR01,
        status: 'processed',
        captureDate: '2026-09-30T16:28:35+05:00',
        dataPath: '/data/plots/fariy_1_test',
        summary: FARIY_1_TEST_SUMMARY,
      },
      {
        // Same capture as FR-01, subsampled to 300k points for fast loading. No summary, so it
        // doesn't double-count FR-01 in block / project statistics.
        id: 'sample',
        name: 'Plot FR-01 · quick preview',
        center: [FR01[0] - 0.0004, FR01[1] + 0.0003],
        status: 'captured',
        captureDate: '2026-09-30T16:28:35+05:00',
        dataPath: '/data/plots/sample',
      },
    ],
  },
  {id: 'ks-b02', name: 'KS-B02 Chattar Slope', status: 'cruised', areaHa: 6.8, at: [520, 380]},
  {id: 'ks-b03', name: 'KS-B03 Nara Nullah', status: 'cruised', areaHa: 3.9, at: [-610, 240]},
  {id: 'ks-b04', name: 'KS-B04 Patriata Spur', status: 'in_progress', areaHa: 5.5, at: [180, -720]},
  {id: 'ks-b05', name: 'KS-B05 Banda Hill', status: 'pending', areaHa: 7.4, at: [-480, -560]},
  {id: 'ks-b06', name: 'KS-B06 Kohala Bend', status: 'pending', areaHa: 4.6, at: [980, -180]},
  {id: 'ks-b07', name: 'KS-B07 Upper Karor', status: 'cruised', areaHa: 3.1, at: [-160, 820]},
];

// ── British Columbia demo projects ──────────────────────────────────────────
// Centres picked on forested ground with harvest cutblocks (checked against Esri imagery).
const OKANAGAN: LonLat = [-119.25, 49.86];
const CARIBOO: LonLat = [-122.35, 52.18];
const KOOTENAY: LonLat = [-117.35, 49.45];

const blk = (id: string, status: BlockSpec['status'], areaHa: number, at: [number, number]): BlockSpec => ({
  id: id.toLowerCase().replace(/\//g, '-'),
  name: id,
  status,
  areaHa,
  at,
});

export const catalog: Project[] = [
  {
    id: 'kotli-sattian',
    name: 'Kotli Sattian Pine Cruise',
    client: 'Punjab Forest Department',
    region: 'Murree Hills, Punjab',
    country: 'Pakistan',
    status: 'active',
    center: FR01,
    areaHa: KS_BLOCKS.reduce((a, b) => a + b.areaHa, 0),
    lastCapture: '2026-09-30',
    species: ['Chir pine'],
    targets: {sph: 600, minDbhCm: 15},
    blocks: blocks(7001, FR01, KS_BLOCKS, PROFILES.chirPine, {spacingM: 50, captureMonth: '2026-09'}),
  },
  {
    id: 'bc-okanagan',
    name: 'Okanagan Highlands Restock Survey',
    client: 'Okanagan Timber Co.',
    region: 'Southern Interior, BC',
    country: 'Canada',
    status: 'active',
    center: OKANAGAN,
    areaHa: 0,
    lastCapture: '2026-08-21',
    species: ['Douglas-fir', 'Lodgepole pine'],
    targets: {sph: 1200, minDbhCm: 7.5},
    blocks: blocks(
      8101,
      OKANAGAN,
      [
        blk('A18667/216/LV4357', 'cruised', 12.6, [0, 0]),
        blk('A18667/541/LV4386', 'cruised', 9.4, [1500, 700]),
        blk('A18667/217/LV4357', 'in_progress', 8.1, [-900, -650]),
        blk('A18670/102/LV4401', 'in_progress', 15.2, [2600, -1100]),
        blk('A18670/118/LV4401', 'pending', 6.3, [-2200, 1300]),
        blk('A18671/009/LV4412', 'pending', 11.0, [700, 2400]),
      ],
      PROFILES.douglasFir,
      {spacingM: 100, captureMonth: '2026-08'},
    ),
  },
  {
    id: 'bc-cariboo',
    name: 'Cariboo Post-Fire Stocking Survey',
    client: 'Williams Lake Community Forest',
    region: 'Cariboo, BC',
    country: 'Canada',
    status: 'completed',
    center: CARIBOO,
    areaHa: 0,
    lastCapture: '2026-07-14',
    species: ['Lodgepole pine', 'Interior spruce'],
    targets: {sph: 1400, minDbhCm: 7.5},
    blocks: blocks(
      8202,
      CARIBOO,
      [
        blk('WL-2021-F14', 'cruised', 18.4, [0, 0]),
        blk('WL-2021-F15', 'cruised', 10.2, [2100, 900]),
        blk('WL-2021-F17', 'cruised', 7.7, [-1600, 1400]),
        blk('WL-2021-F22', 'cruised', 13.9, [900, -1900]),
      ],
      PROFILES.lodgepole,
      {spacingM: 100, captureMonth: '2026-07'},
    ),
  },
  {
    id: 'bc-kootenay',
    name: 'Kootenay Lake Selective Harvest Cruise',
    client: 'Kootenay Lake Forest Products',
    region: 'Kootenay, BC',
    country: 'Canada',
    status: 'planned',
    center: KOOTENAY,
    areaHa: 0,
    species: ['Western redcedar', 'Douglas-fir', 'Spruce'],
    targets: {sph: 900, minDbhCm: 12.5},
    blocks: blocks(
      8303,
      KOOTENAY,
      [
        blk('KL-H301', 'in_progress', 9.8, [0, 0]),
        blk('KL-H302', 'pending', 12.1, [1300, 1100]),
        blk('KL-H305', 'pending', 7.2, [-1500, -500]),
        blk('KL-H309', 'pending', 14.6, [400, -2000]),
        blk('KL-H311', 'pending', 5.4, [-700, 1900]),
      ],
      PROFILES.spruceFir,
      {spacingM: 100, captureMonth: '2026-10'},
    ),
  },
];

// Project area = sum of block areas.
for (const p of catalog) p.areaHa = Math.round(p.blocks.reduce((a, b) => a + b.areaHa, 0) * 10) / 10;
