/** WS-I. Project summary (rendered by WS-H's ProjectPage inside SummaryOverlay when ?tab=summary). */
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, KpiTile} from '@/components/ui';
import {BarList} from '@/features/dashboard/components/BarList';
import {ChartCard} from '@/features/dashboard/components/ChartCard';
import {SpeciesDonut} from '@/features/dashboard/components/SpeciesDonut';
import {StandTableView} from '@/features/dashboard/components/StandTableView';
import {StockingBreakdown} from '@/features/dashboard/components/StockingBreakdown';
import {SummaryHeader} from '@/features/dashboard/components/SummaryHeader';
import {downloadCsv} from '@/features/dashboard/lib/csv';
import {useChartPalette} from '@/features/dashboard/lib/palette';
import {useRealTrees} from '@/features/dashboard/lib/realTrees';
import {speciesShares} from '@/features/dashboard/lib/species';
import {standTable} from '@/features/dashboard/lib/standTable';
import {
  STOCKING_LABEL,
  STOCKING_STATUS_KEY,
  type StockingClass,
  stockingClass,
} from '@/features/dashboard/lib/stocking';
import {BLOCK_STATUS, BLOCK_TONE} from '@/features/map/styles';
import {toast} from '@/features/shell/toast';
import {summarizeBlock, summarizeProject} from '@/lib/aggregate';
import {
  fmtArea,
  fmtBasalArea,
  fmtDate,
  fmtDbh,
  fmtHeight,
  fmtNumber,
  fmtStemsPerHa,
  fmtTonnes,
  fmtVolume,
  fmtVolumePerHa,
} from '@/lib/format';
import type {Project} from '@/types';

export function ProjectSummary({project}: {project: Project}) {
  const navigate = useNavigate();
  const p = useChartPalette();
  const plots = useMemo(() => project.blocks.flatMap((b) => b.plots), [project]);
  const real = useRealTrees(plots);
  const s = useMemo(() => summarizeProject(project), [project]);
  const blocks = useMemo(() => project.blocks.map((b) => ({b, s: summarizeBlock(b)})), [project]);
  const stand = useMemo(() => standTable(plots, real), [plots, real]);

  const stocking = useMemo(() => {
    const c: Record<StockingClass, number> = {stocked: 0, satisfactory: 0, below: 0, unknown: 0};
    for (const {s: bs} of blocks) c[stockingClass(project, bs.stemsPerHa)]++;
    return c;
  }, [blocks, project]);

  const species = speciesShares(project).map((x) => ({
    species: x.species,
    value: x.share * (s.totalStems ?? 0),
    display: `${fmtNumber(x.share * (s.totalStems ?? 0))} stems`,
  }));

  const byVolume = [...blocks]
    .filter(({s: bs}) => bs.totalVolumeM3 != null)
    .sort((a, b) => (b.s.totalVolumeM3 ?? 0) - (a.s.totalVolumeM3 ?? 0));

  const exportCsv = () => {
    downloadCsv(
      `${project.id}_blocks.csv`,
      blocks.map(({b, s: bs}) => ({
        block: b.name,
        status: BLOCK_STATUS[b.status].label,
        area_ha: b.areaHa,
        plots_processed: bs.nPlotsProcessed,
        plots_total: bs.nPlots,
        stems_per_ha: bs.stemsPerHa,
        mean_dbh_cm: bs.dbhCmMean,
        mean_height_m: bs.heightMMean,
        basal_area_m2_ha: bs.basalAreaM2PerHa,
        volume_m3_ha: bs.volumeM3PerHa,
        volume_m3_total: bs.totalVolumeM3,
        co2e_t_total: bs.totalCo2eT,
        stocking: STOCKING_LABEL[stockingClass(project, bs.stemsPerHa)],
      })),
    );
    toast('Block summary CSV downloaded');
  };

  return (
    <div className="p-6">
      <SummaryHeader
        eyebrow="Project summary"
        title={project.name}
        subtitle={`${project.client} · ${project.region}, ${project.country} · as of ${fmtDate(project.lastCapture ?? new Date().toISOString())}`}
        onCsv={exportCsv}
        extra={
          <button
            type="button"
            onClick={() => {
              downloadCsv(
                `${project.id}_stand_table.csv`,
                stand.map((r) => ({
                  dbh_class_cm: r.label,
                  stems_per_ha: r.stemsPerHa,
                  basal_area_m2_ha: r.basalAreaM2PerHa,
                  volume_m3_ha: r.volumeM3PerHa,
                })),
              );
              toast('Stand table CSV downloaded');
            }}
            className="h-8 rounded-lg px-3 text-xs font-medium text-fg-muted hover:bg-surface-hover cursor-pointer"
          >
            Stand table CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Area"
          value={fmtArea(project.areaHa, 1)}
          hint={`${s.nBlocks} blocks · ${s.nBlocksCruised} cruised`}
        />
        <KpiTile
          label="Plots"
          value={`${s.nPlotsProcessed}/${s.nPlots}`}
          hint={`${Math.round(s.progress * 100)}% processed`}
        />
        <KpiTile
          label="Stocking"
          value={fmtStemsPerHa(s.stemsPerHa)}
          hint={`target ${fmtNumber(project.targets.sph)} /ha`}
        />
        <KpiTile label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} hint={`mean DBH ${fmtDbh(s.dbhCmMean)}`} />
        <KpiTile
          label="Volume"
          value={fmtVolumePerHa(s.volumeM3PerHa, 0)}
          hint={`${fmtVolume(s.totalVolumeM3, 0)} total`}
        />
        <KpiTile label="Carbon" value={fmtTonnes(s.totalCo2eT, 0)} hint="CO₂e, est. over area" tone="brand" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Stand table"
          subtitle={`Stems per hectare by 5 cm DBH class · ${s.nTreesMeasured} trees measured · mean height ${fmtHeight(s.heightMMean)}`}
        >
          <StandTableView rows={stand} />
        </ChartCard>
        <div className="grid gap-4">
          <ChartCard title="Species mix" subtitle="Share of stems">
            <SpeciesDonut slices={species} centerValue={fmtNumber(s.totalStems)} centerLabel="est. stems" />
          </ChartCard>
          <ChartCard title="Stocking status" subtitle={`Blocks vs ${fmtNumber(project.targets.sph)} SPH target`}>
            <StockingBreakdown counts={stocking} />
          </ChartCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <ChartCard title="Volume by block" subtitle="Total merchantable volume (expanded to block area)">
          {byVolume.length ? (
            <BarList
              color={p.series}
              items={byVolume.map(({b, s: bs}) => ({
                id: b.id,
                label: b.name,
                value: bs.totalVolumeM3 ?? 0,
                display: fmtVolume(bs.totalVolumeM3, 0),
                onClick: () => navigate(routes.block(project.id, b.id)),
                tooltip: [
                  {label: 'Volume/ha', value: fmtVolumePerHa(bs.volumeM3PerHa, 0)},
                  {label: 'Basal area', value: fmtBasalArea(bs.basalAreaM2PerHa)},
                  {label: 'Area', value: fmtArea(b.areaHa, 1)},
                ],
              }))}
            />
          ) : (
            <p className="py-8 text-center text-sm text-fg-muted">No blocks cruised yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Blocks" subtitle="Click a row to open the block">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[11px] text-fg-muted">
                <tr className="border-b border-border-subtle">
                  <th className="py-1.5 font-medium">Block</th>
                  <th className="py-1.5 font-medium">Status</th>
                  <th className="py-1.5 text-right font-medium">Area</th>
                  <th className="py-1.5 text-right font-medium">Plots</th>
                  <th className="py-1.5 text-right font-medium">SPH</th>
                  <th className="py-1.5 text-right font-medium">BA</th>
                  <th className="py-1.5 text-right font-medium">Vol/ha</th>
                  <th className="py-1.5 pl-3 font-medium">Stocking</th>
                </tr>
              </thead>
              <tbody className="fd-mono">
                {blocks.map(({b, s: bs}) => {
                  const k = stockingClass(project, bs.stemsPerHa);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(routes.block(project.id, b.id))}
                      className="cursor-pointer border-b border-border-subtle/60 hover:bg-surface-hover"
                    >
                      <td className="py-2 font-sans font-medium text-fg">{b.name}</td>
                      <td className="py-2 font-sans">
                        <Badge tone={BLOCK_TONE[b.status]}>{BLOCK_STATUS[b.status].label}</Badge>
                      </td>
                      <td className="py-2 text-right">{fmtNumber(b.areaHa, 1)}</td>
                      <td className="py-2 text-right">
                        {bs.nPlotsProcessed}/{bs.nPlots}
                      </td>
                      <td className="py-2 text-right">{fmtNumber(bs.stemsPerHa)}</td>
                      <td className="py-2 text-right">{fmtNumber(bs.basalAreaM2PerHa, 1)}</td>
                      <td className="py-2 text-right">{fmtNumber(bs.volumeM3PerHa, 0)}</td>
                      <td className="py-2 pl-3 font-sans">
                        <span className="inline-flex items-center gap-1.5 text-fg">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{background: p.status[STOCKING_STATUS_KEY[k]]}}
                          />
                          {STOCKING_LABEL[k]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
