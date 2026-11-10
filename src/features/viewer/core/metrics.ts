/**
 * WS-B. Per-tree metric lookup for the 'metric' colour mode (contract §5.8 `uMetricTex`):
 * a texture indexed by instance id, R = normalised value, A = 255 when the tree has a value.
 */
import * as THREE from 'three';
import type {Tree} from '@/types';
import type {MetricKey} from '../store';

export const METRIC_TEX_WIDTH = 256;

export const METRIC_INFO: Record<MetricKey, {label: string; get: (t: Tree) => number | null; unit: string}> = {
  dbh: {label: 'DBH', get: (t) => t.dbhCm, unit: 'cm'},
  height: {label: 'Height', get: (t) => t.heightM, unit: 'm'},
  volume: {label: 'Volume', get: (t) => t.volumeM3, unit: 'm³'},
};

export interface MetricRange {
  min: number;
  max: number;
}

export function metricRange(trees: Tree[], metric: MetricKey): MetricRange {
  const vals = trees
    .filter((t) => t.valid)
    .map(METRIC_INFO[metric].get)
    .filter((v): v is number => v != null);
  if (!vals.length) return {min: 0, max: 1};
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return {min, max: max > min ? max : min + 1};
}

export function buildMetricTexture(trees: Tree[], metric: MetricKey): THREE.DataTexture {
  const maxId = trees.reduce((m, t) => Math.max(m, t.id), 0);
  const h = Math.ceil((maxId + 1) / METRIC_TEX_WIDTH);
  const data = new Uint8Array(METRIC_TEX_WIDTH * h * 4);
  const {min, max} = metricRange(trees, metric);
  for (const t of trees) {
    const v = t.valid ? METRIC_INFO[metric].get(t) : null;
    if (v == null) continue;
    data[t.id * 4] = Math.round(((v - min) / (max - min)) * 255);
    data[t.id * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, METRIC_TEX_WIDTH, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
