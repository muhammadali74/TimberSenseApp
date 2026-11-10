import {ChevronRight} from 'lucide-react';
import {Link, useParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import {PlaceholderPage} from '@/components/ui';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {findPlot} from '@/lib/aggregate';
import {fmtDate} from '@/lib/format';
import {PlotViewer} from './PlotViewer';

/** Route wrapper: resolves the plot from the catalog, renders the top bar + viewer. */
export function PlotViewerPage() {
  const {projectId = '', blockId = '', plotId = ''} = useParams();
  const loc = findPlot(projectId, blockId, plotId);
  if (!loc) return <NotFoundPage />;
  const {project, block, plot} = loc;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border-subtle bg-surface px-4 text-xs text-fg-muted">
        <Link to={routes.project(project.id)} className="hover:text-fg">
          {project.name}
        </Link>
        <ChevronRight size={14} />
        <Link to={routes.block(project.id, block.id)} className="hover:text-fg">
          {block.name}
        </Link>
        <ChevronRight size={14} />
        <span className="font-medium text-fg">{plot.name}</span>
        {plot.captureDate && <span className="ml-3">Captured {fmtDate(plot.captureDate)}</span>}
      </div>
      <div className="min-h-0 flex-1">
        {plot.dataPath ? (
          <PlotViewer key={plot.dataPath} plotDir={plot.dataPath} />
        ) : (
          <PlaceholderPage title="No point cloud for this plot yet" owner="pending capture" />
        )}
      </div>
    </div>
  );
}
