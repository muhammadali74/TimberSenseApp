/**
 * WS-D owns. Right sidebar: plot summary when nothing is selected, tree details when a tree is selected.
 * Reads only PlotDataContext and the viewer store (§5.7); never touches other workstreams' components.
 */
import {Badge, Sidebar} from '@/components/ui';
import {fmtDate} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {PlotOverview} from './PlotOverview';
import {TreeDetails} from './TreeDetails';

export function ViewerSidebar() {
  const {manifest, treesById, cloud} = usePlotData();
  const selected = useViewerStore((s) => (s.selectedTreeId != null ? treesById.get(s.selectedTreeId) : undefined));

  return (
    <Sidebar
      side="right"
      width={340}
      header={
        <div>
          <div className="text-sm font-semibold">{manifest.name}</div>
          <div className="mt-0.5 text-xs text-fg-muted">
            {fmtDate(manifest.captureDate)} · {manifest.device} · {manifest.operator}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
            {manifest.species.map((sp) => (
              <Badge key={sp} tone="brand" dot>
                {sp}
              </Badge>
            ))}
            <span>{cloud.header.count.toLocaleString()} pts</span>
          </div>
        </div>
      }
    >
      {selected ? <TreeDetails key={selected.id} tree={selected} /> : <PlotOverview />}
    </Sidebar>
  );
}
