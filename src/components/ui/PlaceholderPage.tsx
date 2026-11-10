import {Construction} from 'lucide-react';
import type {ReactNode} from 'react';
import {Badge} from './Badge';

/** Placeholder used by Phase 0 routes until the owning workstream replaces it. */
export function PlaceholderPage({title, owner, children}: {title: string; owner: string; children?: ReactNode}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-app-bg-alt p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Construction size={26} />
        </div>
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        <p className="mt-2 text-sm text-fg-muted">This screen is a placeholder.</p>
        <Badge tone="farmevo" className="mt-3">
          Owner: {owner}
        </Badge>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
