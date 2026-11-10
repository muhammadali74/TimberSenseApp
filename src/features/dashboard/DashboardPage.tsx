/** WS-I. Forest Operation Dashboard (PLAN.md §3.7), SylvaSense `.dashboard-theme` style. */
import {ArrowLeft, Box, FileDown, Search, Settings2, Trees} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, Button} from '@/components/ui';
import {projectsInRegion} from '@/features/map/HomeMapPage';
import {PLOT_STATUS} from '@/features/map/styles';
import {DEVICES} from '@/features/shell/mockData';
import {REGIONS, type RegionId, useShell} from '@/features/shell/shellStore';
import {toast} from '@/features/shell/toast';
import {allPlots, summarizeBlock, summarizeProject} from '@/lib/aggregate';
import {fmtDate, fmtNumber, fmtStemsPerHa, fmtTonnes, fmtVolume} from '@/lib/format';
import type {ProjectStatus} from '@/types';
import {BarList} from './components/BarList';
import {CalendarHeatmap} from './components/CalendarHeatmap';
import {ChartCard} from './components/ChartCard';
import {SpeciesDonut} from './components/SpeciesDonut';
import {StandTableView} from './components/StandTableView';
import {StockingBreakdown} from './components/StockingBreakdown';
import {downloadCsv} from './lib/csv';
import {useChartPalette} from './lib/palette';
import {useRealTrees} from './lib/realTrees';
import {speciesShares} from './lib/species';
import {standTable} from './lib/standTable';
import {type StockingClass, stockingClass} from './lib/stocking';

type StatusFilter = 'all' | ProjectStatus;

const DEVICE_TONE = {online: 'success', capturing: 'info', charging: 'warning', offline: 'neutral'} as const;

const selectCls =
  'h-9 rounded-lg border border-[var(--fd-line-strong)] bg-[var(--fd-inset)] px-2.5 text-xs text-fg outline-none focus:border-brand';

export function DashboardPage() {
  const navigate = useNavigate();
  const p = useChartPalette();
  const region = useShell((s) => s.region);
  const setRegion = useShell((s) => s.setRegion);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');

  const projects = useMemo(
    () =>
      projectsInRegion(region).filter(
        (pr) => (status === 'all' || pr.status === status) && pr.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [region, status, q],
  );
  const plots = useMemo(() => allPlots(projects), [projects]);
  const real = useRealTrees(plots.map((x) => x.plot));
  const summaries = useMemo(() => projects.map((pr) => ({pr, s: summarizeProject(pr)})), [projects]);
  const blocks = useMemo(
    () => projects.flatMap((pr) => pr.blocks.map((b) => ({pr, b, s: summarizeBlock(b)}))),
    [projects],
  );

  const totals = useMemo(() => {
    const sum = (f: (x: (typeof summaries)[number]) => number | null) => summaries.reduce((a, x) => a + (f(x) ?? 0), 0);
    return {
      area: sum((x) => x.pr.areaHa),
      blocks: blocks.length,
      plots: plots.length,
      processed: plots.filter((x) => x.plot.status === 'processed').length,
      trees: sum((x) => x.s.nTreesMeasured),
      volume: sum((x) => x.s.totalVolumeM3),
      co2e: sum((x) => x.s.totalCo2eT),
      stems: sum((x) => x.s.totalStems),
    };
  }, [summaries, blocks, plots]);

  const captureCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const {plot} of plots) {
      if (!plot.captureDate) continue;
      const k = plot.captureDate.slice(0, 10);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [plots]);

  const pipeline = (Object.keys(PLOT_STATUS) as (keyof typeof PLOT_STATUS)[]).map((k) => ({
    id: k,
    label: PLOT_STATUS[k].label,
    value: plots.filter((x) => x.plot.status === k).length,
    color: PLOT_STATUS[k].color,
  }));

  const stocking = useMemo(() => {
    const c: Record<StockingClass, number> = {stocked: 0, satisfactory: 0, below: 0, unknown: 0};
    for (const {pr, s} of blocks) c[stockingClass(pr, s.stemsPerHa)]++;
    return c;
  }, [blocks]);

  const species = useMemo(() => {
    const m = new Map<string, number>();
    for (const {pr, s} of summaries)
      for (const sh of speciesShares(pr)) m.set(sh.species, (m.get(sh.species) ?? 0) + sh.share * (s.totalStems ?? 0));
    return [...m.entries()]
      .filter(([, v]) => v > 0)
      .map(([species, value]) => ({species, value, display: `${fmtNumber(value)} stems`}));
  }, [summaries]);

  const stand = useMemo(
    () =>
      standTable(
        plots.map((x) => x.plot),
        real,
      ),
    [plots, real],
  );

  const recent = useMemo(
    () =>
      plots
        .filter((x) => x.plot.status === 'processed' && x.plot.captureDate)
        .sort(
          // Real 3D plots first (they're the demo's centrepiece), then newest first.
          (a, b) =>
            (b.plot.dataPath ? 1 : 0) - (a.plot.dataPath ? 1 : 0) ||
            (b.plot.captureDate ?? '').localeCompare(a.plot.captureDate ?? ''),
        )
        .slice(0, 6),
    [plots],
  );

  const exportCsv = () => {
    downloadCsv(
      'timbersense_blocks.csv',
      blocks.map(({pr, b, s}) => ({
        project: pr.name,
        region: pr.region,
        block: b.name,
        status: b.status,
        area_ha: b.areaHa,
        plots_processed: s.nPlotsProcessed,
        plots_total: s.nPlots,
        stems_per_ha: s.stemsPerHa,
        basal_area_m2_ha: s.basalAreaM2PerHa,
        volume_m3_ha: s.volumeM3PerHa,
        volume_m3_total: s.totalVolumeM3,
        co2e_t_total: s.totalCo2eT,
      })),
    );
    toast('Dashboard data exported (CSV)');
  };

  const regionLabel = REGIONS.find((r) => r.id === region)?.label ?? 'All regions';
  const pct = totals.plots ? totals.processed / totals.plots : 0;

  return (
    <div className="dashboard-theme h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Header + hero */}
        <section className="fd-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.18em] text-[var(--fd-accent-ink)] uppercase">
                TimberSense
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-fg">Forest Operation Dashboard</h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
                <span className="h-2 w-2 rounded-full bg-brand" /> {regionLabel}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={<Settings2 size={14} />}
                onClick={() => toast('Chart layout editing is coming soon', 'info')}
              >
                Manage charts
              </Button>
              <Button size="sm" icon={<FileDown size={14} />} onClick={exportCsv}>
                Export CSV
              </Button>
              <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => navigate(routes.home())}>
                Back
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fd-accent-soft)] text-[var(--fd-accent-ink)]">
                <Trees size={22} />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="fd-mono text-5xl font-semibold text-fg">{fmtNumber(totals.processed)}</span>
                <span className="text-sm text-fg-muted">
                  plots <span className="font-semibold text-[var(--fd-accent-ink)]">processed</span>
                  <br />
                  of {fmtNumber(totals.plots)} on the cruise plan
                </span>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--fd-ghost)]">
                <div className="h-full rounded-full bg-brand" style={{width: `${pct * 100}%`}} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-fg-muted">
                <span>{Math.round(pct * 100)}% processed</span>
                <span>{fmtNumber(totals.plots - totals.processed)} to go</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-4 border-t border-[var(--fd-line)] pt-5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Projects', fmtNumber(projects.length)],
              ['Blocks', fmtNumber(totals.blocks)],
              ['Area (ha)', fmtNumber(totals.area, 1)],
              ['Trees measured', fmtNumber(totals.trees)],
              ['Volume', fmtVolume(totals.volume, 0)],
              ['Carbon (CO₂e)', fmtTonnes(totals.co2e, 0)],
            ].map(([k, v]) => (
              <div key={k} className="border-[var(--fd-line)] lg:border-l lg:pl-5 lg:first:border-l-0 lg:first:pl-0">
                <div className="text-xs text-fg-muted">{k}</div>
                <div className="fd-mono mt-1 text-xl font-semibold text-fg">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Filters — one row above the charts */}
        <div className="fd-card mt-4 flex flex-wrap items-center gap-2 px-4 py-3">
          <select
            className={selectCls}
            value={region}
            onChange={(e) => setRegion(e.target.value as RegionId)}
            aria-label="Region"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Project status"
          >
            <option value="all">All project statuses</option>
            <option value="active">Active</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
          </select>
          <label className={`${selectCls} flex w-56 items-center gap-2`}>
            <Search size={14} className="text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
          <span className="ml-auto text-xs text-fg-muted">
            <span className="font-semibold text-fg">{projects.length}</span> projects · {totals.blocks} blocks ·{' '}
            {totals.plots} plots
          </span>
          <button
            type="button"
            onClick={() => {
              setRegion('all');
              setStatus('all');
              setQ('');
            }}
            className="text-xs text-fg-muted underline hover:text-fg cursor-pointer"
          >
            Reset all
          </button>
        </div>

        {/* Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ChartCard
            variant="fd"
            className="lg:col-span-2"
            title="Capture activity (6 months)"
            subtitle="Plots captured per day — hover a day for details"
          >
            <CalendarHeatmap counts={captureCounts} end={new Date('2026-11-10T00:00:00Z')} />
          </ChartCard>
          <ChartCard variant="fd" title="Plot pipeline" subtitle="Where every planned plot is">
            <BarList
              color={p.series}
              items={pipeline.map((x) => ({
                id: x.id,
                label: x.label,
                value: x.value,
                display: fmtNumber(x.value),
                color: x.color,
              }))}
            />
            <p className="mt-4 text-[11px] text-fg-muted">
              Processing typically completes within 20 minutes of upload.
            </p>
          </ChartCard>

          <ChartCard variant="fd" title="Stocking status" subtitle="Blocks vs project SPH targets">
            <StockingBreakdown counts={stocking} />
          </ChartCard>
          <ChartCard variant="fd" title="Species mix" subtitle="Estimated stems across cruised area">
            {species.length ? (
              <SpeciesDonut
                slices={species}
                centerValue={`${fmtNumber(totals.stems / 1000, 0)}k`}
                centerLabel="est. stems"
              />
            ) : (
              <p className="py-8 text-center text-sm text-fg-muted">No cruised blocks in this selection.</p>
            )}
          </ChartCard>
          <ChartCard variant="fd" title="Volume by project" subtitle="Total volume, expanded to block area">
            <BarList
              color={p.series}
              items={summaries
                .filter((x) => x.s.totalVolumeM3)
                .sort((a, b) => (b.s.totalVolumeM3 ?? 0) - (a.s.totalVolumeM3 ?? 0))
                .map(({pr, s}) => ({
                  id: pr.id,
                  label: pr.name,
                  value: s.totalVolumeM3 ?? 0,
                  display: fmtVolume(s.totalVolumeM3, 0),
                  onClick: () => navigate(routes.project(pr.id, 'summary')),
                  tooltip: [
                    {label: 'Stocking', value: fmtStemsPerHa(s.stemsPerHa)},
                    {label: 'CO₂e', value: fmtTonnes(s.totalCo2eT, 0)},
                    {label: 'Plots', value: `${s.nPlotsProcessed}/${s.nPlots}`},
                  ],
                }))}
            />
          </ChartCard>

          <ChartCard
            variant="fd"
            className="lg:col-span-2"
            title="DBH distribution"
            subtitle="All processed plots · stems per hectare by 5 cm class"
          >
            <StandTableView rows={stand} height={230} />
          </ChartCard>
          <ChartCard variant="fd" title="Device fleet" subtitle="Plots captured per unit">
            <BarList
              color={p.series}
              items={DEVICES.map((d) => ({
                id: d.id,
                label: (
                  <span className="flex items-center gap-2">
                    {d.name}
                    <Badge tone={DEVICE_TONE[d.status]}>{d.status}</Badge>
                  </span>
                ),
                value: d.plotsCaptured,
                display: fmtNumber(d.plotsCaptured),
                tooltip: [
                  {label: 'Operator', value: d.operator},
                  {label: 'Battery', value: `${d.battery}%`},
                  {label: 'Capture hours', value: d.hoursCaptured.toFixed(1)},
                ],
                onClick: () => navigate(routes.devices()),
              }))}
            />
          </ChartCard>

          <ChartCard variant="fd" className="lg:col-span-3" title="Recent captures" subtitle="Latest processed plots">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map(({project, block, plot}) => (
                <li key={plot.id}>
                  <Link
                    to={plot.dataPath ? routes.plot(project.id, block.id, plot.id) : routes.block(project.id, block.id)}
                    className="flex items-center gap-3 rounded-xl bg-[var(--fd-inset)] p-3 hover:bg-[var(--fd-hover)]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: plot.dataPath ? 'var(--color-farmevo-soft)' : 'var(--fd-accent-soft)',
                        color: plot.dataPath ? 'var(--color-farmevo)' : 'var(--fd-accent-ink)',
                      }}
                    >
                      {plot.dataPath ? <Box size={16} /> : <Trees size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-fg">
                        {plot.name} <span className="font-normal text-fg-muted">· {block.name}</span>
                      </span>
                      <span className="block truncate text-[11px] text-fg-muted">
                        {project.name} · {fmtDate(plot.captureDate)}
                      </span>
                    </span>
                    <span className="fd-mono text-[11px] text-fg">{fmtStemsPerHa(plot.summary?.stemsPerHa)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
