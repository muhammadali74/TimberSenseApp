/**
 * Shared (contract) — loaded plot data available to every viewer layer and panel.
 * Read with `usePlotData()`; never refetch plot files inside a layer.
 */
import {createContext, useContext} from 'react';
import type {CloudData, PlotManifest, Trajectory, Tree} from '@/types';

export interface PlotData {
  /** e.g. '/data/plots/fariy_1_test' — resolve relative manifest paths with plotUrl(plotDir, rel) */
  plotDir: string;
  manifest: PlotManifest;
  cloud: CloudData;
  trees: Tree[];
  /** id → tree, for O(1) lookups from instance ids */
  treesById: Map<number, Tree>;
  trajectory: Trajectory | null;
}

export const PlotDataContext = createContext<PlotData | null>(null);

export function usePlotData(): PlotData {
  const ctx = useContext(PlotDataContext);
  if (!ctx) throw new Error('usePlotData must be used inside <PlotViewer>');
  return ctx;
}
