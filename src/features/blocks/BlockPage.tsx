import {useParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import {PlaceholderPage} from '@/components/ui';
import {CatalogLinks} from '@/features/projects/CatalogLinks';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {findBlock} from '@/lib/aggregate';

/** WS-H: block satellite view with plot markers (PLAN.md §3.5). WS-I: `?tab=summary`. */
export function BlockPage() {
  const {projectId = '', blockId = ''} = useParams();
  const block = findBlock(projectId, blockId);
  if (!block) return <NotFoundPage />;
  return (
    <PlaceholderPage title={block.name} owner="WS-H">
      <CatalogLinks
        items={block.plots.map((p) => ({
          to: routes.plot(projectId, block.id, p.id),
          label: p.name,
          meta: p.dataPath ? 'Open 3D viewer' : 'No data yet',
          status: p.status,
        }))}
      />
    </PlaceholderPage>
  );
}
