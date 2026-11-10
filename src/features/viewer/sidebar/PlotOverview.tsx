/** WS-D owns. Right sidebar content when no tree is selected: plot KPIs, distributions, tree list, rejected instances. */
import {ChevronDown, Download} from 'lucide-react';
import {useState} from 'react';
import {Button, KpiTile, SidebarSection, Tabs} from '@/components/ui';
import {fmtAreaM2, fmtBasalArea, fmtDbh, fmtHeight, fmtStemsPerHa, fmtTonnes, fmtVolumePerHa} from '@/lib/format';
import type {Tree} from '@/types';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {TreeHistogram} from './TreeHistogram';
import {TreeTable} from './TreeTable';
import {downloadText, parseRejectReason, treesToCsv} from './treeStats';

type Dist = 'dbh' | 'height';
// Stable references so the histogram's memo holds across renders.
const dbhOf = (t: Tree) => t.dbhCm;
const heightOf = (t: Tree) => t.heightM;

export function PlotOverview() {
  const {manifest, trees} = usePlotData();
  const s = manifest.summary;
  const [dist, setDist] = useState<Dist>('dbh');
  const rejected = trees.filter((t) => !t.valid);

  return (
    <>
      <SidebarSection title="Plot summary">
        <div className="grid grid-cols-2 gap-2">
          <KpiTile size="sm" tone="brand" label="Trees" value={s.nValidTrees} hint={`${s.nRejected} rejected`} />
          <KpiTile size="sm" label="Stocking" value={fmtStemsPerHa(s.stemsPerHa)} hint={fmtAreaM2(s.plotAreaM2)} />
          <KpiTile
            size="sm"
            label="Mean DBH"
            value={fmtDbh(s.dbhCmMean)}
            hint={`QMD ${fmtDbh(s.quadraticMeanDbhCm)}`}
          />
          <KpiTile
            size="sm"
            label="Mean height"
            value={fmtHeight(s.heightMMean)}
            hint={`max ${fmtHeight(s.heightMMax)}`}
          />
          <KpiTile size="sm" label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} />
          <KpiTile size="sm" label="Volume" value={fmtVolumePerHa(s.woodVolumeM3PerHa)} />
          <KpiTile size="sm" label="Biomass" value={`${fmtTonnes(s.biomassTPerHa)}/ha`} hint={fmtTonnes(s.biomassT)} />
          <KpiTile size="sm" label="CO₂e" value={fmtTonnes(s.co2eT, 2)} hint={`C ${fmtTonnes(s.carbonT, 2)}`} />
        </div>
        {s.nThinningRemove > 0 && (
          <p className="mt-2 text-xs text-fg-muted">
            <span className="font-semibold text-danger">{s.nThinningRemove}</span> trees flagged for thinning ·{' '}
            {s.nSpacingConflictTrees} in spacing conflict
          </p>
        )}
      </SidebarSection>

      <SidebarSection
        title="Distribution"
        action={
          <Tabs<Dist>
            value={dist}
            onChange={setDist}
            items={[
              {id: 'dbh', label: 'DBH'},
              {id: 'height', label: 'Height'},
            ]}
          />
        }
      >
        {dist === 'dbh' ? (
          <TreeHistogram trees={trees} value={dbhOf} binWidth={5} unit="cm" />
        ) : (
          <TreeHistogram trees={trees} value={heightOf} binWidth={1} unit="m" />
        )}
        <div className="mt-1 text-center text-[11px] text-fg-subtle">
          {dist === 'dbh' ? 'DBH class (5 cm)' : 'Height class (1 m)'} · trees per class
        </div>
      </SidebarSection>

      <SidebarSection
        title="Trees"
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={<Download size={14} />}
            onClick={() => downloadText(`${manifest.id}_trees.csv`, treesToCsv(trees))}
          >
            CSV
          </Button>
        }
      >
        <TreeTable trees={trees} />
      </SidebarSection>

      {rejected.length > 0 && <RejectedList rejected={rejected} />}
    </>
  );
}

function RejectedList({rejected}: {rejected: Tree[]}) {
  const [open, setOpen] = useState(false);
  const selectTree = useViewerStore((s) => s.selectTree);
  const hoverTree = useViewerStore((s) => s.hoverTree);
  const requestCamera = useViewerStore((s) => s.requestCamera);

  return (
    <SidebarSection>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
      >
        Rejected instances ({rejected.length})
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {rejected.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  selectTree(t.id);
                  requestCamera({kind: 'focusTree', id: t.id});
                }}
                onMouseEnter={() => hoverTree(t.id)}
                onMouseLeave={() => hoverTree(null)}
                className="flex w-full cursor-pointer items-baseline gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-surface-hover"
              >
                <span className="fd-mono w-10 shrink-0 font-semibold">#{t.id}</span>
                <span className="text-fg-muted">
                  {parseRejectReason(t.rejectReason)
                    .map((r) => r.label)
                    .join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidebarSection>
  );
}
