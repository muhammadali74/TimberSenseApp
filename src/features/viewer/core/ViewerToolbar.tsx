/**
 * WS-B owns the toolbar frame and the core items. Other workstreams render their own buttons
 * through their `*ToolbarItems` component (already wired below) — no edits to this file needed.
 * Also renders the colour legend (bottom-left) and the walk-mode hint (top-centre).
 */
import {Pill} from '@/components/ui';
import {FlythroughToolbarItems} from '../flythrough/FlythroughToolbarItems';
import {ReplayToolbarItems} from '../replay/ReplayToolbarItems';
import {useViewerStore} from '../store';
import {TreesToolbarItems} from '../trees/TreesToolbarItems';
import {ColorLegend} from './ColorLegend';
import {CoreToolbarItems} from './CoreToolbarItems';

function WalkHint() {
  const walking = useViewerStore((s) => s.cameraMode === 'walk');
  if (!walking) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
      <div className="glass-panel rounded-full px-4 py-1.5 text-xs text-fg-muted">
        <b className="text-fg">W A S D</b> move · <b className="text-fg">drag</b> to look ·{' '}
        <b className="text-fg">Shift</b> run · <b className="text-fg">Esc</b> back to orbit
      </div>
    </div>
  );
}

export function ViewerToolbar() {
  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-2">
        <Pill className="pointer-events-auto flex-col items-stretch gap-0.5 p-1">
          <CoreToolbarItems />
          <TreesToolbarItems />
          <ReplayToolbarItems />
          <FlythroughToolbarItems />
        </Pill>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10">
        <ColorLegend />
      </div>
      <WalkHint />
    </>
  );
}
