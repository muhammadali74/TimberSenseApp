/**
 * Viewer composition (contract §5.9). Each child lives in the folder of the workstream that owns it;
 * this file only wires them together — add new layers here in a contract PR.
 */
import {useEffect} from 'react';
import {Spinner} from '@/components/ui';
import {CameraController} from './core/CameraController';
import {DtmLayer} from './core/DtmLayer';
import {EdlPass} from './core/EdlPass';
import {PointCloudLayer} from './core/PointCloudLayer';
import {ViewerCanvas} from './core/ViewerCanvas';
import {ViewerToolbar} from './core/ViewerToolbar';
import {FlythroughControls} from './flythrough/FlythroughControls';
import {PlotDataContext} from './PlotDataContext';
import {CameraFeeds} from './replay/CameraFeeds';
import {ReplayTimeline} from './replay/ReplayTimeline';
import {RigMarker} from './replay/RigMarker';
import {TrajectoryLayer} from './replay/TrajectoryLayer';
import {ViewerSidebar} from './sidebar/ViewerSidebar';
import {useViewerStore} from './store';
import {QsmMeshLayer} from './trees/QsmMeshLayer';
import {TreeMarkersLayer} from './trees/TreeMarkersLayer';
import {TreePicker} from './trees/TreePicker';
import {usePlotLoader} from './usePlotLoader';

export function PlotViewer({plotDir}: {plotDir: string}) {
  const state = usePlotLoader(plotDir);
  const reset = useViewerStore((s) => s.reset);

  // Fresh viewer state for every plot.
  useEffect(() => {
    reset();
    return reset;
  }, [reset]);

  if (state.status === 'loading') {
    return (
      <div className="viewer-canvas-bg flex h-full w-full flex-col items-center justify-center gap-4 text-white/80">
        <Spinner size={36} />
        <div className="text-sm">{state.stage}…</div>
        <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-brand transition-[width]" style={{width: `${Math.round(state.progress * 100)}%`}} />
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="viewer-canvas-bg flex h-full w-full items-center justify-center p-8 text-center text-sm text-white/80">
        <div>
          <p className="text-base font-semibold text-white">Couldn’t load this plot</p>
          <p className="mt-2 text-white/60">{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <PlotDataContext.Provider value={state.data}>
      <div className="flex h-full w-full">
        <div className="relative min-w-0 flex-1">
          <ViewerCanvas>
            <PointCloudLayer />
            <DtmLayer />
            <TreeMarkersLayer />
            <TreePicker />
            <QsmMeshLayer />
            <TrajectoryLayer />
            <RigMarker />
            <CameraController />
            <EdlPass />
          </ViewerCanvas>
          <ViewerToolbar />
          <CameraFeeds />
          <ReplayTimeline />
          <FlythroughControls />
        </div>
        <ViewerSidebar />
      </div>
    </PlotDataContext.Provider>
  );
}
