/** WS-I. Lazily loads trees.json for real plots so stand tables use actual stem diameters. */
import {useEffect, useState} from 'react';
import type {PlotRef, Tree} from '@/types';

const cache = new Map<string, Promise<Tree[]>>();

function load(dataPath: string): Promise<Tree[]> {
  let p = cache.get(dataPath);
  if (!p) {
    p = fetch(`${dataPath}/trees.json`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : []))
      .catch(() => []);
    cache.set(dataPath, p);
  }
  return p;
}

/** dataPath → trees, for every real plot in `plots` (empty map until loaded). */
export function useRealTrees(plots: PlotRef[]): Map<string, Tree[]> {
  const paths = [
    ...new Set(plots.filter((p) => p.dataPath && p.status === 'processed').map((p) => p.dataPath as string)),
  ];
  const key = paths.join('|');
  const [map, setMap] = useState<Map<string, Tree[]>>(new Map());
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the joined path list
  useEffect(() => {
    let cancelled = false;
    Promise.all(paths.map(async (p) => [p, await load(p)] as const)).then((entries) => {
      if (!cancelled) setMap(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return map;
}
