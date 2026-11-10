/** WS-I. Card frame for charts; `variant="fd"` uses the dashboard's green gradient card. */
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function ChartCard({
  title,
  subtitle,
  actions,
  variant = 'plain',
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  variant?: 'plain' | 'fd';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col p-5',
        variant === 'fd' ? 'fd-card' : 'rounded-2xl border border-border-subtle bg-surface',
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
