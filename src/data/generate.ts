/**
 * WS-H. Deterministic generators for the demo catalog: block polygons, systematic plot grids and
 * plausible plot summaries. Seeded, so the catalog is identical on every load.
 */
import type {Block, BlockStatus, LonLat, PlotRef, PlotStatus, PlotSummary} from '@/types';

/** mulberry32 — tiny seeded PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof rng>;
const between = (r: Rand, a: number, b: number) => a + (b - a) * r();

const M_PER_DEG_LAT = 111_320;
const mPerDegLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Offset a lon/lat by metres east/north. */
export function offsetLonLat([lon, lat]: LonLat, east: number, north: number): LonLat {
  return [lon + east / mPerDegLon(lat), lat + north / M_PER_DEG_LAT];
}

/** Irregular, roughly elliptical block outline with the given area (ha). Closed ring. */
export function blockPolygon(r: Rand, center: LonLat, areaHa: number, elongation = between(r, 1.1, 2.2)): LonLat[] {
  const n = 10 + Math.floor(r() * 5);
  const rot = r() * Math.PI;
  // Mean radius of an ellipse with this area and aspect ratio.
  const base = Math.sqrt((areaHa * 10_000) / (Math.PI * elongation));
  const radii = Array.from({length: n}, () => between(r, 0.82, 1.12));
  // Smooth the radial noise so outlines look like stand boundaries, not stars.
  const smooth = radii.map((v, i) => (v * 2 + radii[(i + 1) % n] + radii[(i - 1 + n) % n]) / 4);
  const ring: LonLat[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ex = Math.cos(a) * base * elongation * smooth[i];
    const ny = Math.sin(a) * base * smooth[i];
    const east = ex * Math.cos(rot) - ny * Math.sin(rot);
    const north = ex * Math.sin(rot) + ny * Math.cos(rot);
    ring.push(offsetLonLat(center, east, north));
  }
  ring.push(ring[0]);
  return ring;
}

export function pointInRing([x, y]: LonLat, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function ringCentroid(ring: LonLat[]): LonLat {
  const pts = ring.slice(0, -1);
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

/** Systematic cruise grid: points `spacingM` apart inside the polygon (random grid offset). */
export function plotGrid(r: Rand, ring: LonLat[], spacingM: number, maxPlots = 40): LonLat[] {
  const c = ringCentroid(ring);
  const lat = c[1];
  const ox = r() * spacingM;
  const oy = r() * spacingM;
  const out: LonLat[] = [];
  const span = 2000;
  for (let e = -span + ox; e <= span; e += spacingM) {
    for (let n = -span + oy; n <= span; n += spacingM) {
      const p: LonLat = [c[0] + e / mPerDegLon(lat), c[1] + n / M_PER_DEG_LAT];
      if (pointInRing(p, ring)) out.push(p);
    }
  }
  return out.slice(0, maxPlots);
}

export interface StandProfile {
  sph: [number, number];
  dbhCm: [number, number];
  heightM: [number, number];
  /** kg/m³ */
  woodDensity: number;
  /** stem form factor for volume = BA × H × form */
  form: number;
}

export const PROFILES = {
  chirPine: {sph: [420, 780], dbhCm: [24, 36], heightM: [4.8, 8.5], woodDensity: 500, form: 0.52},
  douglasFir: {sph: [450, 950], dbhCm: [22, 42], heightM: [17, 31], woodDensity: 450, form: 0.42},
  lodgepole: {sph: [900, 1700], dbhCm: [12, 24], heightM: [11, 22], woodDensity: 410, form: 0.44},
  spruceFir: {sph: [600, 1200], dbhCm: [16, 34], heightM: [14, 28], woodDensity: 380, form: 0.43},
} satisfies Record<string, StandProfile>;

const PLOT_AREA_M2 = 400; // 11.28 m radius fixed-area plot

export function plotSummary(r: Rand, p: StandProfile): PlotSummary {
  const sph = Math.round(between(r, ...p.sph) / 25) * 25;
  const dbh = between(r, ...p.dbhCm);
  const qmd = dbh * between(r, 1.02, 1.06);
  const h = between(r, ...p.heightM);
  const ba = sph * Math.PI * (qmd / 200) ** 2;
  const vol = ba * h * p.form;
  const biomassTHa = (vol * p.woodDensity) / 1000;
  const scale = PLOT_AREA_M2 / 10_000;
  const n = Math.max(1, Math.round(sph * scale));
  const rejected = Math.round(n * between(r, 0.05, 0.3));
  const carbonT = biomassTHa * scale * 0.5;
  return {
    plotAreaM2: PLOT_AREA_M2,
    nInstances: n + rejected,
    nValidTrees: n,
    nRejected: rejected,
    stemsPerHa: sph,
    dbhCmMean: dbh,
    dbhCmMedian: dbh * between(r, 0.95, 1.02),
    dbhCmMin: dbh * between(r, 0.45, 0.65),
    dbhCmMax: dbh * between(r, 1.35, 1.7),
    quadraticMeanDbhCm: qmd,
    heightMMean: h,
    heightMMax: h * between(r, 1.25, 1.5),
    basalAreaM2: ba * scale,
    basalAreaM2PerHa: ba,
    woodVolumeM3: vol * scale,
    woodVolumeM3PerHa: vol,
    biomassT: biomassTHa * scale,
    biomassTPerHa: biomassTHa,
    carbonT,
    co2eT: carbonT * 3.667,
    nSpacingConflictTrees: Math.round(n * between(r, 0.1, 0.6)),
    nThinningRemove: Math.round(n * between(r, 0.05, 0.35)),
  };
}

export interface BlockSpec {
  id: string;
  name: string;
  status: BlockStatus;
  areaHa: number;
  /** metres east / north of the project centre */
  at: [number, number];
  /** override the generated plots (e.g. to inject real plots) */
  extraPlots?: PlotRef[];
}

/** Generate a block: outline, systematic plot grid and per-plot statuses/summaries. */
export function makeBlock(
  seed: number,
  projectCenter: LonLat,
  spec: BlockSpec,
  profile: StandProfile,
  opts: {spacingM: number; plotPrefix: string; captureMonth: string},
): Block {
  const r = rng(seed);
  const center = offsetLonLat(projectCenter, spec.at[0], spec.at[1]);
  const polygon = blockPolygon(r, center, spec.areaHa);
  const pts = plotGrid(r, polygon, opts.spacingM);
  const plots: PlotRef[] = pts.map((p, i) => {
    let status: PlotStatus = 'pending';
    if (spec.status === 'cruised') status = 'processed';
    else if (spec.status === 'in_progress') {
      const roll = r();
      if (roll < 0.55) status = 'processed';
      else if (r() < 0.5) status = 'captured';
    }
    const day = String(1 + Math.floor(r() * 27)).padStart(2, '0');
    return {
      id: `${spec.id}-p${String(i + 1).padStart(2, '0')}`,
      name: `${opts.plotPrefix}-${String(i + 1).padStart(2, '0')}`,
      center: p,
      status,
      captureDate: status === 'pending' ? undefined : `${opts.captureMonth}-${day}`,
      summary: status === 'processed' ? plotSummary(r, profile) : undefined,
    };
  });
  return {
    id: spec.id,
    name: spec.name,
    status: spec.status,
    areaHa: spec.areaHa,
    polygon,
    plots: [...(spec.extraPlots ?? []), ...plots],
  };
}
