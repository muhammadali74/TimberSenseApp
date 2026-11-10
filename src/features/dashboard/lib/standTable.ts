/**
 * WS-I. DBH-class stand table (5 cm classes) from fixed-area plots.
 * Real plots use their measured stems (trees.json); demo plots get a seeded DBH sample derived
 * from their summary (mean, min, max, tree count). Per-hectare values = mean over processed plots.
 */
import {rng} from '@/data/generate';
import type {PlotRef, Tree} from '@/types';

export const CLASS_WIDTH_CM = 5;

export interface StandRow {
  /** lower bound, cm */
  cls: number;
  label: string;
  stemsPerHa: number;
  basalAreaM2PerHa: number;
  volumeM3PerHa: number;
  pctStems: number;
}

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

function synthDbh(plot: PlotRef): number[] {
  const s = plot.summary!;
  const r = rng(hash(plot.id));
  const sd = Math.max(2, (s.dbhCmMax - s.dbhCmMin) / 4);
  const out: number[] = [];
  for (let i = 0; i < s.nValidTrees; i++) {
    // Box–Muller, clipped to the plot's observed range.
    const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    out.push(Math.min(s.dbhCmMax, Math.max(s.dbhCmMin, s.dbhCmMean + z * sd)));
  }
  return out;
}

export function plotDbhSample(plot: PlotRef, real: Map<string, Tree[]>): number[] {
  const trees = plot.dataPath ? real.get(plot.dataPath) : undefined;
  if (trees?.length) return trees.filter((t) => t.valid && t.dbhCm != null).map((t) => t.dbhCm as number);
  return plot.summary ? synthDbh(plot) : [];
}

export function standTable(plots: PlotRef[], real: Map<string, Tree[]>): StandRow[] {
  const processed = plots.filter((p) => p.status === 'processed' && p.summary);
  if (!processed.length) return [];
  const acc = new Map<number, {n: number; ba: number; vol: number}>();
  for (const p of processed) {
    const s = p.summary!;
    const ef = 10_000 / s.plotAreaM2;
    const dbhs = plotDbhSample(p, real);
    const baTotal = dbhs.reduce((a, d) => a + Math.PI * (d / 200) ** 2, 0) || 1;
    for (const d of dbhs) {
      const cls = Math.floor(d / CLASS_WIDTH_CM) * CLASS_WIDTH_CM;
      const ba = Math.PI * (d / 200) ** 2;
      const row = acc.get(cls) ?? {n: 0, ba: 0, vol: 0};
      row.n += ef;
      row.ba += ba * ef;
      // Allocate the plot's measured volume by basal-area share.
      row.vol += (ba / baTotal) * s.woodVolumeM3PerHa;
      acc.set(cls, row);
    }
  }
  const k = processed.length;
  const classes = [...acc.keys()].sort((a, b) => a - b);
  if (!classes.length) return [];
  const all: number[] = [];
  for (let c = classes[0]; c <= classes[classes.length - 1]; c += CLASS_WIDTH_CM) all.push(c);
  const totalStems = [...acc.values()].reduce((a, r) => a + r.n, 0) / k;
  return all.map((cls) => {
    const r = acc.get(cls) ?? {n: 0, ba: 0, vol: 0};
    return {
      cls,
      label: `${cls}–${cls + CLASS_WIDTH_CM}`,
      stemsPerHa: r.n / k,
      basalAreaM2PerHa: r.ba / k,
      volumeM3PerHa: r.vol / k,
      pctStems: totalStems ? r.n / k / totalStems : 0,
    };
  });
}
