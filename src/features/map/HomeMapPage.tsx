import {routes} from '@/app/routes';
import {PlaceholderPage} from '@/components/ui';
import {catalog} from '@/data/catalog';
import {CatalogLinks} from '@/features/projects/CatalogLinks';

/** WS-H: full-bleed satellite map with clustered projects (PLAN.md §3.3). */
export function HomeMapPage() {
  return (
    <PlaceholderPage title="Home map" owner="WS-H">
      <CatalogLinks
        items={catalog.map((p) => ({
          to: routes.project(p.id),
          label: p.name,
          meta: `${p.region}, ${p.country}`,
          status: p.status,
        }))}
      />
    </PlaceholderPage>
  );
}
