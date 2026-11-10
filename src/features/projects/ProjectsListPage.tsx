/** WS-H. Projects list view (cards) — the non-map alternative to the home map. */
import {Map as MapIcon, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, Button, Tabs} from '@/components/ui';
import {catalog} from '@/data/catalog';
import {projectsInRegion} from '@/features/map/HomeMapPage';
import {BLOCK_STATUS, countBy, PROJECT_STATUS} from '@/features/map/styles';
import {useShell} from '@/features/shell/shellStore';
import {PageLayout} from '@/features/shell/stubs/PageLayout';
import {summarizeProject} from '@/lib/aggregate';
import {fmtArea, fmtBasalArea, fmtDate, fmtStemsPerHa, fmtTonnes} from '@/lib/format';
import type {ProjectStatus} from '@/types';

type Filter = 'all' | ProjectStatus;

export function ProjectsListPage() {
  const region = useShell((s) => s.region);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const projects = useMemo(
    () =>
      projectsInRegion(region).filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          `${p.name} ${p.client} ${p.region}`.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [region, filter, q],
  );
  return (
    <PageLayout title="Projects" subtitle={`${catalog.length} cruise projects across your regions.`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            {id: 'all', label: 'All'},
            {id: 'active', label: 'Active'},
            {id: 'planned', label: 'Planned'},
            {id: 'completed', label: 'Completed'},
          ]}
        />
        <label className="flex h-9 w-64 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={15} className="text-fg-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter projects"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => {
          const s = summarizeProject(p);
          const st = PROJECT_STATUS[p.status];
          const counts = countBy(p.blocks, (b) => b.status);
          return (
            <article key={p.id} className="flex flex-col rounded-2xl border border-border-subtle bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-fg">{p.name}</h2>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {p.client} · {p.region}, {p.country}
                  </div>
                </div>
                <Badge tone={st.tone} dot>
                  {st.label}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ['Area', fmtArea(p.areaHa, 1)],
                  ['Stocking', fmtStemsPerHa(s.stemsPerHa)],
                  ['Basal area', fmtBasalArea(s.basalAreaM2PerHa)],
                  ['CO₂e', fmtTonnes(s.totalCo2eT, 0)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface-2 py-2">
                    <div className="fd-mono text-[13px] font-semibold">{v}</div>
                    <div className="text-[10px] text-fg-muted">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-fg-muted">
                  <span>
                    {(Object.keys(BLOCK_STATUS) as (keyof typeof BLOCK_STATUS)[])
                      .filter((k) => counts[k])
                      .map((k) => `${counts[k]} ${BLOCK_STATUS[k].label.toLowerCase()}`)
                      .join(' · ')}
                  </span>
                  <span className="fd-mono">
                    {s.nPlotsProcessed}/{s.nPlots} plots
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-brand" style={{width: `${s.progress * 100}%`}} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
                <span className="text-xs text-fg-muted">
                  {p.lastCapture ? `Last capture ${fmtDate(p.lastCapture)}` : 'No captures yet'}
                </span>
                <div className="flex gap-2">
                  <Link to={`${routes.home()}?project=${p.id}`}>
                    <Button size="sm" variant="ghost" icon={<MapIcon size={14} />}>
                      On map
                    </Button>
                  </Link>
                  <Link to={routes.project(p.id)}>
                    <Button size="sm" variant="primary">
                      Open project
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!projects.length && <p className="py-12 text-center text-sm text-fg-muted">No projects match these filters.</p>}
    </PageLayout>
  );
}
