import {useParams, useSearchParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import {PlaceholderPage} from '@/components/ui';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {findProject, summarizeProject} from '@/lib/aggregate';
import {fmtArea, fmtVolumePerHa} from '@/lib/format';
import {CatalogLinks} from './CatalogLinks';

/** WS-H: project map + sidebar (PLAN.md §3.4). WS-I: `?tab=summary` content. */
export function ProjectPage() {
  const {projectId = ''} = useParams();
  const [params] = useSearchParams();
  const project = findProject(projectId);
  if (!project) return <NotFoundPage />;
  const s = summarizeProject(project);
  return (
    <PlaceholderPage title={project.name} owner={params.get('tab') === 'summary' ? 'WS-I' : 'WS-H'}>
      <p className="mb-4 text-xs text-fg-muted">
        {fmtArea(s.areaHa)} · {s.nPlotsProcessed}/{s.nPlots} plots processed · {fmtVolumePerHa(s.volumeM3PerHa)}
      </p>
      <CatalogLinks
        items={project.blocks.map((b) => ({
          to: routes.block(project.id, b.id),
          label: b.name,
          meta: `${b.plots.length} plots · ${fmtArea(b.areaHa)}`,
          status: b.status,
        }))}
      />
    </PlaceholderPage>
  );
}
