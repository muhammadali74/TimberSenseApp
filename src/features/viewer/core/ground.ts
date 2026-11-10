/**
 * WS-B. Ground height lookup in the plot frame, built from ground-class points.
 * Used by walk mode for terrain following; WS-E/WS-F may import `useGround()` (read-only).
 */
import {useMemo} from 'react';
import type {CloudData} from '@/types';
import {usePlotData} from '../PlotDataContext';

const CELL_M = 0.5;

export class GroundSampler {
  readonly x0: number;
  readonly y0: number;
  readonly nx: number;
  readonly ny: number;
  private readonly z: Float32Array;

  constructor(cloud: CloudData) {
    const {min, max} = cloud.header.bbox;
    this.x0 = min[0];
    this.y0 = min[1];
    this.nx = Math.max(1, Math.ceil((max[0] - min[0]) / CELL_M) + 1);
    this.ny = Math.max(1, Math.ceil((max[1] - min[1]) / CELL_M) + 1);
    const sum = new Float64Array(this.nx * this.ny);
    const cnt = new Uint32Array(this.nx * this.ny);
    const {position: p, semantic: s} = cloud;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== 0) continue;
      const c = this.cell(p[i * 3], p[i * 3 + 1]);
      sum[c] += p[i * 3 + 2];
      cnt[c]++;
    }
    const z = new Float32Array(this.nx * this.ny).fill(Number.NaN);
    for (let c = 0; c < z.length; c++) if (cnt[c]) z[c] = sum[c] / cnt[c];
    // Fill holes by repeatedly averaging known neighbours.
    for (let pass = 0, missing = 1; missing && pass < 200; pass++) {
      missing = 0;
      const next = z.slice();
      for (let ix = 0; ix < this.nx; ix++) {
        for (let iy = 0; iy < this.ny; iy++) {
          const c = ix * this.ny + iy;
          if (!Number.isNaN(z[c])) continue;
          let acc = 0;
          let n = 0;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const jx = ix + dx;
            const jy = iy + dy;
            if (jx < 0 || jy < 0 || jx >= this.nx || jy >= this.ny) continue;
            const v = z[jx * this.ny + jy];
            if (!Number.isNaN(v)) {
              acc += v;
              n++;
            }
          }
          if (n) next[c] = acc / n;
          else missing++;
        }
      }
      z.set(next);
    }
    for (let c = 0; c < z.length; c++) if (Number.isNaN(z[c])) z[c] = 0;
    this.z = z;
  }

  private cell(x: number, y: number): number {
    const ix = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.x0) / CELL_M)));
    const iy = Math.min(this.ny - 1, Math.max(0, Math.floor((y - this.y0) / CELL_M)));
    return ix * this.ny + iy;
  }

  /** Bilinear ground height at (x, y); clamps outside the plot. */
  heightAt(x: number, y: number): number {
    const fx = Math.min(this.nx - 1.001, Math.max(0, (x - this.x0) / CELL_M - 0.5));
    const fy = Math.min(this.ny - 1.001, Math.max(0, (y - this.y0) / CELL_M - 0.5));
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const nx1 = Math.min(ix + 1, this.nx - 1);
    const ny1 = Math.min(iy + 1, this.ny - 1);
    const a = this.z[ix * this.ny + iy];
    const b = this.z[nx1 * this.ny + iy];
    const c = this.z[ix * this.ny + ny1];
    const d = this.z[nx1 * this.ny + ny1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
}

const cache = new WeakMap<CloudData, GroundSampler>();

export function getGround(cloud: CloudData): GroundSampler {
  let g = cache.get(cloud);
  if (!g) {
    g = new GroundSampler(cloud);
    cache.set(cloud, g);
  }
  return g;
}

export function useGround(): GroundSampler {
  const {cloud} = usePlotData();
  return useMemo(() => getGround(cloud), [cloud]);
}
