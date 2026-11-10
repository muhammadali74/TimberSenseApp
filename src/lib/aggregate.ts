/**
 * Contract §5.6 — shared aggregation so map panels, summaries and the dashboard show identical numbers.
 *
 * Cruise statistics follow the usual fixed-area plot method: per-hectare values are the mean over
 * processed plots in the block, and totals are the per-hectare mean × block area.
 */
import {catalog} from '@/data/catalog';
import type {Block, PlotRef, PlotSummary, Project} from '@/types';

export interface AggregateSummary {
  areaHa: number;
  nBlocks: number;
  nBlocksCruised: number;
  nPlots: number;
  nPlotsProcessed: number;
  /** Trees actually measured in processed plots. */
  nTreesMeasured: number;
  stemsPerHa: number | null;
  dbhCmMean: number | null;
  heightMMean: number | null;
  basalAreaM2PerHa: number | null;
  volumeM3PerHa: number | null;
  biomassTPerHa: number | null;
  co2eTPerHa: number | null;
  /** Expanded to the full area. */
  totalVolumeM3: number | null;
  totalBiomassT: number | null;
  totalCo2eT: number | null;
  /** Estimated stems over the full area. */
  totalStems: number | null;
  /** 0..1 — processed plots / all plots */
  progress: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function weightedMean(pairs: Array<[value: number | null, weight: number]>): number | null {
  let sw = 0;
  let s = 0;
  for (const [v, w] of pairs) {
    if (v == null || w <= 0) continue;
    s += v * w;
    sw += w;
  }
  return sw > 0 ? s / sw : null;
}

const processedSummaries = (plots: PlotRef[]): PlotSummary[] =>
  plots.filter((p) => p.status === 'processed' && p.summary).map((p) => p.summary as PlotSummary);

const times = (a: number | null, b: number) => (a == null ? null : a * b);

export function summarizePlots(plots: PlotRef[], areaHa: number): Omit<AggregateSummary, 'nBlocks' | 'nBlocksCruised'> {
  const s = processedSummaries(plots);
  const stemsPerHa = mean(s.map((x) => x.stemsPerHa));
  const volumeM3PerHa = mean(s.map((x) => x.woodVolumeM3PerHa));
  const biomassTPerHa = mean(s.map((x) => x.biomassTPerHa));
  const co2eTPerHa = mean(s.map((x) => (x.co2eT / x.plotAreaM2) * 10_000));
  return {
    areaHa,
    nPlots: plots.length,
    nPlotsProcessed: s.length,
    nTreesMeasured: s.reduce((a, x) => a + x.nValidTrees, 0),
    stemsPerHa,
    dbhCmMean: weightedMean(s.map((x) => [x.dbhCmMean, x.nValidTrees])),
    heightMMean: weightedMean(s.map((x) => [x.heightMMean, x.nValidTrees])),
    basalAreaM2PerHa: mean(s.map((x) => x.basalAreaM2PerHa)),
    volumeM3PerHa,
    biomassTPerHa,
    co2eTPerHa,
    totalVolumeM3: times(volumeM3PerHa, areaHa),
    totalBiomassT: times(biomassTPerHa, areaHa),
    totalCo2eT: times(co2eTPerHa, areaHa),
    totalStems: times(stemsPerHa, areaHa),
    progress: plots.length ? s.length / plots.length : 0,
  };
}

export function summarizeBlock(block: Block): AggregateSummary {
  return {
    ...summarizePlots(block.plots, block.areaHa),
    nBlocks: 1,
    nBlocksCruised: block.status === 'cruised' ? 1 : 0,
  };
}

/** Project per-ha values are area-weighted over blocks that have processed plots. */
export function summarizeProject(project: Project): AggregateSummary {
  const blocks = project.blocks.map((b) => ({b, s: summarizeBlock(b)}));
  const w = (pick: (s: AggregateSummary) => number | null) => weightedMean(blocks.map(({b, s}) => [pick(s), b.areaHa]));
  const sum = (pick: (s: AggregateSummary) => number | null) => {
    const vs = blocks.map(({s}) => pick(s)).filter((v): v is number => v != null);
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
  };
  const nPlots = blocks.reduce((a, {s}) => a + s.nPlots, 0);
  const nPlotsProcessed = blocks.reduce((a, {s}) => a + s.nPlotsProcessed, 0);
  return {
    areaHa: project.areaHa,
    nBlocks: project.blocks.length,
    nBlocksCruised: project.blocks.filter((b) => b.status === 'cruised').length,
    nPlots,
    nPlotsProcessed,
    nTreesMeasured: blocks.reduce((a, {s}) => a + s.nTreesMeasured, 0),
    stemsPerHa: w((s) => s.stemsPerHa),
    dbhCmMean: weightedMean(blocks.map(({s}) => [s.dbhCmMean, s.nTreesMeasured])),
    heightMMean: weightedMean(blocks.map(({s}) => [s.heightMMean, s.nTreesMeasured])),
    basalAreaM2PerHa: w((s) => s.basalAreaM2PerHa),
    volumeM3PerHa: w((s) => s.volumeM3PerHa),
    biomassTPerHa: w((s) => s.biomassTPerHa),
    co2eTPerHa: w((s) => s.co2eTPerHa),
    totalVolumeM3: sum((s) => s.totalVolumeM3),
    totalBiomassT: sum((s) => s.totalBiomassT),
    totalCo2eT: sum((s) => s.totalCo2eT),
    totalStems: sum((s) => s.totalStems),
    progress: nPlots ? nPlotsProcessed / nPlots : 0,
  };
}

export interface PlotLocation {
  project: Project;
  block: Block;
  plot: PlotRef;
}

/** Every plot in the catalog with its parents. */
export function allPlots(projects: Project[] = catalog): PlotLocation[] {
  return projects.flatMap((project) =>
    project.blocks.flatMap((block) => block.plots.map((plot) => ({project, block, plot}))),
  );
}

export function findProject(projectId: string, projects: Project[] = catalog): Project | undefined {
  return projects.find((p) => p.id === projectId);
}

export function findBlock(projectId: string, blockId: string, projects: Project[] = catalog): Block | undefined {
  return findProject(projectId, projects)?.blocks.find((b) => b.id === blockId);
}

export function findPlot(
  projectId: string,
  blockId: string,
  plotId: string,
  projects: Project[] = catalog,
): PlotLocation | undefined {
  const project = findProject(projectId, projects);
  const block = project?.blocks.find((b) => b.id === blockId);
  const plot = block?.plots.find((p) => p.id === plotId);
  return project && block && plot ? {project, block, plot} : undefined;
}
