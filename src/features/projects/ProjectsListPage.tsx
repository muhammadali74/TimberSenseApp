import {routes} from '@/app/routes';
import {PlaceholderPage} from '@/components/ui';
import {catalog} from '@/data/catalog';
import {CatalogLinks} from './CatalogLinks';

/** WS-H: projects cards/table view (PLAN.md §3.3). */
export function ProjectsListPage() {
  return (
    <PlaceholderPage title="Projects" owner="WS-H">
      <CatalogLinks
        items={catalog.map((p) => ({to: routes.project(p.id), label: p.name, meta: p.client, status: p.status}))}
      />
    </PlaceholderPage>
  );
}
