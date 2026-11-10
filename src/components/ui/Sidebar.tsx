import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export interface SidebarProps {
  side?: 'left' | 'right';
  width?: number;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Full-height panel used for block/project sidebars and the viewer info panel. */
export function Sidebar({side = 'left', width = 320, header, footer, className, children}: SidebarProps) {
  return (
    <aside
      style={{width}}
      className={cn(
        'flex h-full shrink-0 flex-col bg-surface',
        side === 'left' ? 'border-r' : 'border-l',
        'border-border-subtle',
        className,
      )}
    >
      {header && <div className="border-b border-border-subtle px-4 py-3">{header}</div>}
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="border-t border-border-subtle px-4 py-3">{footer}</div>}
    </aside>
  );
}

export function SidebarSection({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('px-4 py-3 border-b border-border-subtle last:border-b-0', className)}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h4>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
