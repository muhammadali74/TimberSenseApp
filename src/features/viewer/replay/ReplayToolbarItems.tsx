/**
 * WS-E. Toolbar: capture path toggle, bird's-eye path overview, start/stop the capture replay
 * (first person), show the camera window.
 */
import {Footprints, PictureInPicture, Route, Waypoints} from 'lucide-react';
import {ToolbarButton, ToolbarDivider} from '../core/ToolbarButton';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {enterPathView, exitPathView} from './PathOverview';
import {useReplayUi} from './replayUi';

export function ReplayToolbarItems() {
  const {trajectory} = usePlotData();
  const layers = useViewerStore((s) => s.layers);
  const setLayers = useViewerStore((s) => s.setLayers);
  const replaying = useViewerStore((s) => s.playback.enabled);
  const setPlayback = useViewerStore((s) => s.setPlayback);
  const setCameraMode = useViewerStore((s) => s.setCameraMode);
  const pipVisible = useReplayUi((s) => s.pipVisible);
  const setPip = useReplayUi((s) => s.setPip);
  const pathView = useReplayUi((s) => s.pathView);

  if (!trajectory) return null;

  const toggleReplay = () => {
    if (replaying) {
      setPlayback({enabled: false, playing: false});
      if (useViewerStore.getState().cameraMode === 'follow') setCameraMode('orbit');
      return;
    }
    setPlayback({enabled: true, playing: false});
    setCameraMode('follow');
    setPip({pipVisible: true});
  };

  return (
    <>
      <ToolbarDivider />
      <ToolbarButton
        label="Capture path"
        active={layers.trajectory}
        onClick={() => setLayers({trajectory: !layers.trajectory})}
      >
        <Route size={18} />
      </ToolbarButton>
      <ToolbarButton
        label="Path overview (bird's-eye view)"
        active={pathView}
        onClick={() => (pathView ? exitPathView() : enterPathView())}
      >
        <Waypoints size={18} />
      </ToolbarButton>
      <ToolbarButton
        label={replaying ? 'Stop capture replay' : 'Replay capture (walk it in first person)'}
        active={replaying}
        onClick={toggleReplay}
      >
        <Footprints size={18} />
      </ToolbarButton>
      {replaying && (
        <ToolbarButton label="Camera window" active={pipVisible} onClick={() => setPip({pipVisible: !pipVisible})}>
          <PictureInPicture size={18} />
        </ToolbarButton>
      )}
    </>
  );
}
