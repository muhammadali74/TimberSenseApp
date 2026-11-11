/** WS-H. Right-hand project card on the home map (SylvaSense block-details style). */
import {BarChart3, Download, FileText, MapPin, Trees, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Badge, Button, KpiTile} from '@/components/ui';
import {toast} from '@/features/shell/toast';
import {summarizeProject} from '@/lib/aggregate';
import {fmtArea, fmtBasalArea, fmtDate, fmtNumber, fmtStemsPerHa, fmtTonnes, fmtVolumePerHa} from '@/lib/format';
import type {Project} from '@/types';
import {BLOCK_STATUS, countBy, PROJECT_STATUS} from './styles';

export function ProjectPanel({project, onClose}: {project: Project; onClose: () => void}) {
  const navigate = useNavigate();
  const s = summarizeProject(project);
  const st = PROJECT_STATUS[project.status];
  const byStatus = countBy(project.blocks, (b) => b.status);
  return (
    <aside className="absolute top-[84px] right-4 bottom-4 z-10 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl">
      <div className="relative px-5 pt-5 pb-4 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-md p-1 text-fg-subtle hover:bg-surface-hover cursor-pointer"
        >
          <X size={16} />
        </button>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Trees size={22} />
        </div>
        <div className="fd-mono mt-3 text-[28px] leading-none font-semibold">{fmtArea(project.areaHa, 1)}</div>
        <h2 className="mt-2 text-base font-semibold">{project.name}</h2>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-fg-muted">
          <MapPin size={12} /> {project.region}, {project.country}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          <Badge tone={st.tone} dot>
            {st.label}
          </Badge>
          {project.lastCapture && <Badge>Last capture {fmtDate(project.lastCapture)}</Badge>}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto border-t border-border-subtle px-5 py-4">
        <div className="text-xs text-fg-muted">
          Client <span className="font-medium text-fg">{project.client}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KpiTile
            size="sm"
            label="Stocking"
            value={fmtStemsPerHa(s.stemsPerHa)}
            hint={`target ${fmtNumber(project.targets.sph)} /ha`}
          />
          <KpiTile size="sm" label="Basal area" value={fmtBasalArea(s.basalAreaM2PerHa)} />
          <KpiTile
            size="sm"
            label="Volume"
            value={fmtVolumePerHa(s.volumeM3PerHa)}
            hint={s.totalVolumeM3 != null ? `${fmtNumber(s.totalVolumeM3)} m³ total` : undefined}
          />
          <KpiTile size="sm" label="Carbon" value={fmtTonnes(s.totalCo2eT, 0)} hint="CO₂e est." tone="brand" />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-fg-muted">Cruise progress</span>
            <span className="fd-mono text-fg">
              {s.nPlotsProcessed}/{s.nPlots} plots
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-brand" style={{width: `${s.progress * 100}%`}} />
          </div>
          <div className="mt-2 flex gap-3 text-[11px]">
            {(Object.keys(BLOCK_STATUS) as (keyof typeof BLOCK_STATUS)[]).map((k) => (
              <span key={k} className="flex items-center gap-1 text-fg-muted">
                <span className="h-2 w-2 rounded-full" style={{background: BLOCK_STATUS[k].color}} />
                {byStatus[k] ?? 0} {BLOCK_STATUS[k].label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium text-fg-muted">Species</div>
          <div className="flex flex-wrap gap-1.5">
            {project.species.map((sp) => (
              <Badge key={sp} tone="brand" dot>
                {sp}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<BarChart3 size={15} />}
            onClick={() => navigate(routes.project(project.id, 'summary'))}
          >
            Project summary
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="justify-center"
              icon={<FileText size={15} />}
              onClick={() => toast('Cruise report is being generated — it will appear in Reports')}
            >
              Cruise report
            </Button>
            <Button
              className="justify-center"
              icon={<Download size={15} />}
              onClick={() => toast('Block boundaries exported (KML)')}
            >
              Export KML
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle p-4">
        <Button
          variant="dark"
          size="lg"
          className="w-full justify-center"
          onClick={() => navigate(routes.project(project.id))}
        >
          View project
        </Button>
      </div>
    </aside>
  );
}
