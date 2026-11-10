/** Phase 0 helper: plain link lists so the drill-down is navigable before WS-H builds the maps. */
import {Link} from 'react-router-dom';
import {Badge} from '@/components/ui';

export function CatalogLinks({items}: {items: Array<{to: string; label: string; meta?: string; status?: string}>}) {
  return (
    <ul className="mx-auto w-full max-w-md divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface text-left">
      {items.map((it) => (
        <li key={it.to}>
          <Link to={it.to} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-hover">
            <span>
              <span className="block text-sm font-medium text-fg">{it.label}</span>
              {it.meta && <span className="block text-xs text-fg-muted">{it.meta}</span>}
            </span>
            {it.status && (
              <Badge
                tone={
                  it.status === 'processed' || it.status === 'cruised' || it.status === 'active' ? 'brand' : 'neutral'
                }
              >
                {it.status.replace('_', ' ')}
              </Badge>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
