/** WS-I. Block summary (rendered by WS-H's BlockPage inside SummaryOverlay when ?tab=summary). */
import {Box} from 'lucide-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {routes} from '@/app/routes';
import {Badge, KpiTile} from '@/components/ui';
import {ChartCard} from '@/features/dashboard/components/ChartCard';
import {TooltipBox} from '@/features/dashboard/components/ChartTooltip';
import {SpeciesDonut} from '@/features/dashboard/components/SpeciesDonut';
import {StandTableView} from '@/features/dashboard/components/StandTableView';
import {SummaryHeader} from '@/features/dashboard/components/SummaryHeader';
import {downloadCsv} from '@/features/dashboard/lib/csv';
import {useChartPalette} from '@/features/dashboard/lib/palette';
import {useRealTrees} from '@/features/dashboard/lib/realTrees';
import {speciesShares} from '@/features/dashboard/lib/species';
import {standTable} from '@/features/dashboard/lib/standTable';
import {STOCKING_LABEL, STOCKING_STATUS_KEY, stockingClass} from '@/features/dashboard/lib/stocking';
import {BLOCK_STATUS, PLOT_STATUS, PLOT_TONE} from '@/features/map/styles';
import {toast} from '@/features/shell/toast';
import {summarizeBlock} from '@/lib/aggregate';
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
import type {Block, Project} from '@/types';

export function BlockSummary({project, block}: {project: Project; block: Block}) {
  const navigate = useNavigate();
  const p = useChartPalette();
  const real = useRealTrees(block.plots);
  const s = useMemo(() => summarizeBlock(block), [block]);
  const stand = useMemo(() => standTable(block.plots, real), [block, real]);
  const k = stockingClass(project, s.stemsPerHa);
  const processed = block.plots.filter((pl) => pl.summary);
  const plotBars = processed.map((pl) => ({
    name: pl.name,
    sph: pl.summary!.stemsPerHa,
    ba: pl.summary!.basalAreaM2PerHa,
    real: !!pl.dataPath,
  }));
  const species = speciesShares(project).map((x) => ({
    species: x.species,
    value: x.share * (s.stemsPerHa ?? 0),
    display: `${fmtNumber(x.share * (s.stemsPerHa ?? 0))} /ha`,
  }));

  const exportCsv = () => {
    downloadCsv(
      `${block.id}_plots.csv`,
      block.plots.map((pl) => ({
        plot: pl.name,
        status: PLOT_STATUS[pl.status].label,
        capture_date: pl.captureDate?.slice(0, 10),
        lon: pl.center[0],
        lat: pl.center[1],
        trees: pl.summary?.nValidTrees,
        stems_per_ha: pl.summary?.stemsPerHa,
        mean_dbh_cm: pl.summary?.dbhCmMean,
        mean_height_m: pl.summary?.heightMMean,
        basal_area_m2_ha: pl.summary?.basalAreaM2PerHa,
        volume_m3_ha: pl.summary?.woodVolumeM3PerHa,
        co2e_t: pl.summary?.co2eT,
      })),
    );
    toast('Plot table CSV downloaded');
  };

  return (
    <div className="p-6">
      <SummaryHeader
        eyebrow="Block summary"
        title={`Block ${block.name}`}
        subtitle={`${project.name} · ${fmtArea(block.areaHa)} · ${BLOCK_STATUS[block.status].label}`}
        onCsv={exportCsv}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Plots" value={`${s.nPlotsProcessed}/${s.nPlots}`} hint={`${s.nTreesMeasured} trees measured`} />
        <KpiTile
          label="Stocking"
          value={fmtStemsPerHa(s.stemsPerHa)}
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{background: p.status[STOCKING_STATUS_KEY[k]]}} />
              {STOCKING_LABEL[k]} · target {fmtNumber(project.targets.sph)}
            </span>
          }
        />
        <KpiTile label="Mean DBH" value={fmtDbh(s.dbhCmMean)} hint={`mean height ${fmtHeight(s.heightMMean)}`} />
        <KpiTile label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} />
        <KpiTile
          label="Volume"
          value={fmtVolumePerHa(s.volumeM3PerHa, 0)}
          hint={`${fmtVolume(s.totalVolumeM3, 0)} total`}
        />
        <KpiTile label="Carbon" value={fmtTonnes(s.totalCo2eT, 0)} hint="CO₂e over block" tone="brand" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <ChartCard title="Stand table" subtitle="Stems per hectare by 5 cm DBH class">
          <StandTableView rows={stand} />
        </ChartCard>
        <div className="grid gap-4">
          <ChartCard
            title="Stocking by plot"
            subtitle={`Stems/ha · dashed line = ${fmtNumber(project.targets.sph)} target`}
          >
            {plotBars.length ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plotBars} margin={{top: 6, right: 4, bottom: 0, left: -14}} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke={p.grid} />
                    <XAxis dataKey="name" hide />
                    <YAxis tickLine={false} axisLine={false} tick={{fontSize: 10, fill: p.axis}} width={44} />
                    <ReferenceLine y={project.targets.sph} stroke={p.axis} strokeDasharray="4 4" />
                    <Tooltip
                      cursor={{fill: p.grid}}
                      content={({active, payload}) => {
                        const r = active && (payload?.[0]?.payload as (typeof plotBars)[number] | undefined);
                        if (!r) return null;
                        return (
                          <TooltipBox
                            title={r.name}
                            rows={[
                              {label: 'Stems', value: `${fmtNumber(r.sph)} /ha`},
                              {label: 'Basal area', value: fmtBasalArea(r.ba)},
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar dataKey="sph" fill={p.series} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-fg-muted">No processed plots yet.</p>
            )}
          </ChartCard>
          <ChartCard title="Species mix" subtitle="Share of stems">
            <SpeciesDonut slices={species} centerValue={fmtNumber(s.stemsPerHa)} centerLabel="stems/ha" />
          </ChartCard>
        </div>
      </div>

      <ChartCard className="mt-4" title="Plots" subtitle={`${block.plots.length} plots on the cruise grid`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-[11px] text-fg-muted">
              <tr className="border-b border-border-subtle">
                <th className="py-1.5 font-medium">Plot</th>
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5 font-medium">Captured</th>
                <th className="py-1.5 text-right font-medium">Trees</th>
                <th className="py-1.5 text-right font-medium">SPH</th>
                <th className="py-1.5 text-right font-medium">DBH</th>
                <th className="py-1.5 text-right font-medium">Height</th>
                <th className="py-1.5 text-right font-medium">BA</th>
                <th className="py-1.5 text-right font-medium">Vol/ha</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="fd-mono">
              {block.plots.map((pl) => (
                <tr key={pl.id} className="border-b border-border-subtle/60">
                  <td className="py-2 font-sans font-medium text-fg">{pl.name}</td>
                  <td className="py-2 font-sans">
                    <Badge tone={PLOT_TONE[pl.status]}>{PLOT_STATUS[pl.status].label}</Badge>
                  </td>
                  <td className="py-2 font-sans text-fg-muted">{pl.captureDate ? fmtDate(pl.captureDate) : '—'}</td>
                  <td className="py-2 text-right">{pl.summary?.nValidTrees ?? '—'}</td>
                  <td className="py-2 text-right">{fmtNumber(pl.summary?.stemsPerHa)}</td>
                  <td className="py-2 text-right">{fmtNumber(pl.summary?.dbhCmMean, 1)}</td>
                  <td className="py-2 text-right">{fmtNumber(pl.summary?.heightMMean, 1)}</td>
                  <td className="py-2 text-right">{fmtNumber(pl.summary?.basalAreaM2PerHa, 1)}</td>
                  <td className="py-2 text-right">{fmtNumber(pl.summary?.woodVolumeM3PerHa, 0)}</td>
                  <td className="py-2 text-right font-sans">
                    {pl.dataPath && (
                      <button
                        type="button"
                        onClick={() => navigate(routes.plot(project.id, block.id, pl.id))}
                        className="inline-flex items-center gap-1 rounded-md bg-farmevo-soft px-2 py-0.5 text-[11px] font-semibold text-farmevo cursor-pointer"
                      >
                        <Box size={12} /> 3D
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
