/**
 * WS-D owns. Right sidebar: plot summary when nothing is selected, tree details when a tree is selected.
 * Phase 0: minimal summary so the data contract is visibly exercised.
 */
import {Badge, KpiTile, Sidebar, SidebarSection} from '@/components/ui';
import {fmtBasalArea, fmtDbh, fmtHeight, fmtStemsPerHa, fmtVolumePerHa} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';

export function ViewerSidebar() {
  const {manifest, trees, treesById, cloud} = usePlotData();
  const selected = useViewerStore((s) => (s.selectedTreeId != null ? treesById.get(s.selectedTreeId) : undefined));
  const s = manifest.summary;
  return (
    <Sidebar
      side="right"
      width={340}
      header={
        <div>
          <div className="text-sm font-semibold">{manifest.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
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
      {selected ? (
        <SidebarSection title={`Tree ${selected.id}`}>
          <div className="grid grid-cols-2 gap-2">
            <KpiTile label="DBH" value={fmtDbh(selected.dbhCm)} size="sm" />
            <KpiTile label="Height" value={fmtHeight(selected.heightM)} size="sm" />
          </div>
        </SidebarSection>
      ) : (
        <SidebarSection title="Plot summary">
          <div className="grid grid-cols-2 gap-2">
            <KpiTile label="Trees" value={`${s.nValidTrees}/${trees.length}`} size="sm" />
            <KpiTile label="Stems" value={fmtStemsPerHa(s.stemsPerHa)} size="sm" />
            <KpiTile label="Mean DBH" value={fmtDbh(s.dbhCmMean)} size="sm" />
            <KpiTile label="Mean height" value={fmtHeight(s.heightMMean)} size="sm" />
            <KpiTile label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} size="sm" />
            <KpiTile label="Volume" value={fmtVolumePerHa(s.woodVolumeM3PerHa)} size="sm" />
          </div>
        </SidebarSection>
      )}
    </Sidebar>
  );
}
