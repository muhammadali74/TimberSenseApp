import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'farmevo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function KpiTile({label, value, hint, icon, tone = 'default', size = 'md', className}: KpiTileProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        tone === 'default' && 'bg-surface-2 border-border-subtle',
        tone === 'brand' && 'bg-brand-soft border-brand/20',
        tone === 'farmevo' && 'bg-farmevo-soft border-farmevo/20',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'fd-mono font-semibold text-fg mt-1',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-xl',
          size === 'lg' && 'text-3xl',
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-fg-subtle mt-0.5">{hint}</div>}
    </div>
  );
}
