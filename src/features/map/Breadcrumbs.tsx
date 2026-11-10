/** WS-H. Compact breadcrumb trail for map sidebars. */
import {ChevronRight} from 'lucide-react';
import {Link} from 'react-router-dom';

export function Breadcrumbs({items}: {items: {label: string; to?: string}[]}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-fg-subtle" />}
          {it.to ? (
            <Link to={it.to} className="hover:text-fg">
              {it.label}
            </Link>
          ) : (
            <span className="text-fg">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
