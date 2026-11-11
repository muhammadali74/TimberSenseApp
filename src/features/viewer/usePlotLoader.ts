import {useEffect, useState} from 'react';
import {loadCamera, loadCloud, loadManifest, loadTrajectory, loadTrees} from '@/lib/loaders';
import type {PlotData} from './PlotDataContext';

export type LoadState =
  | {status: 'loading'; stage: string; progress: number}
  | {status: 'error'; error: string}
  | {status: 'ready'; data: PlotData};

export function usePlotLoader(plotDir: string): LoadState {
  const [state, setState] = useState<LoadState>({status: 'loading', stage: 'Reading manifest', progress: 0});

  useEffect(() => {
    let cancelled = false;
    const update = (s: LoadState) => !cancelled && setState(s);
    (async () => {
      try {
        update({status: 'loading', stage: 'Reading manifest', progress: 0});
        const manifest = await loadManifest(plotDir);
        update({status: 'loading', stage: 'Loading trees', progress: 0.02});
        const [trees, trajectory, camera] = await Promise.all([
          loadTrees(plotDir, manifest),
          loadTrajectory(plotDir, manifest),
          loadCamera(plotDir, manifest),
        ]);
        const cloud = await loadCloud(plotDir, manifest, (loaded, total) =>
          update({
            status: 'loading',
            stage: 'Streaming point cloud',
            progress: total ? 0.05 + 0.95 * (loaded / total) : 0.5,
          }),
        );
        update({
          status: 'ready',
          data: {plotDir, manifest, cloud, trees, trajectory, camera, treesById: new Map(trees.map((t) => [t.id, t]))},
        });
      } catch (e) {
        update({status: 'error', error: e instanceof Error ? e.message : String(e)});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plotDir]);

  return state;
}
