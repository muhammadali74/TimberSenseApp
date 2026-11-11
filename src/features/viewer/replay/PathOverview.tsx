/**
 * WS-E. Bird's-eye path overview: switches to a top-down orbit view of the plot with the capture
 * path drawn over the point cloud (TrajectoryLayer renders it on top in this mode). Mouse: drag to
 * rotate, right-drag to pan, scroll to zoom (B's OrbitControls). Works with or without a replay
 * running — during replay the rig, walked trail and path ahead are visible from above.
 * Leaves automatically when the camera leaves orbit mode (first person, walk, flythrough).
 */
import {Compass, Waypoints, X} from 'lucide-react';
import {useEffect, useMemo} from 'react';
import {fmtDistance, fmtDuration} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {PATH_GRADIENT_CSS} from './pathColors';
import {useReplayUi} from './replayUi';
import {getPath} from './trajectoryPath';

/** Enter the overview: path on, orbit camera, top-down view. */
export function enterPathView() {
  const viewer = useViewerStore.getState();
  useReplayUi.getState().setPathView(true);
  viewer.setLayers({trajectory: true});
  if (viewer.cameraMode !== 'orbit') viewer.setCameraMode('orbit');
  viewer.requestCamera({kind: 'view', view: 'top'});
}

export function exitPathView() {
  useReplayUi.getState().setPathView(false);
}

/** Info panel (top centre) + auto-exit when the camera mode leaves orbit. */
export function PathOverview() {
  const {trajectory} = usePlotData();
  const pathView = useReplayUi((s) => s.pathView);
  const cameraMode = useViewerStore((s) => s.cameraMode);
  const requestCamera = useViewerStore((s) => s.requestCamera);

  useEffect(() => {
    if (pathView && cameraMode !== 'orbit') exitPathView();
  }, [pathView, cameraMode]);

  const stats = useMemo(() => {
    if (!trajectory) return null;
    const p = getPath(trajectory);
    return {length: p.dist[p.dist.length - 1], duration: p.duration};
  }, [trajectory]);

  if (!pathView || !stats) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
      <div className="glass-panel pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2 text-xs">
        <Waypoints size={16} className="shrink-0 text-brand" />
        <div>
          <div className="font-semibold text-fg">Capture path</div>
          <div className="text-fg-muted">
            {fmtDistance(stats.length)} · {fmtDuration(stats.duration)}
          </div>
        </div>
        <div className="w-36">
          <div className="h-1.5 rounded-full" style={{background: PATH_GRADIENT_CSS}} />
          <div className="fd-mono mt-0.5 flex justify-between text-[10px] text-fg-subtle">
            <span>start 0:00</span>
            <span>{fmtDuration(stats.duration)} end</span>
          </div>
        </div>
        <div className="hidden text-[11px] leading-tight text-fg-muted lg:block">
          <b className="text-fg">drag</b> rotate · <b className="text-fg">right-drag</b> pan ·{' '}
          <b className="text-fg">scroll</b> zoom
        </div>
        <button
          type="button"
          title="Back to top-down view"
          onClick={() => requestCamera({kind: 'view', view: 'top'})}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          <Compass size={15} />
        </button>
        <button
          type="button"
          title="Close path overview"
          onClick={exitPathView}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
