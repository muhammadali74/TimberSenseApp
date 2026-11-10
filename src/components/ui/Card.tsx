import type {HTMLAttributes, ReactNode} from 'react';
import {cn} from '@/lib/cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}

export function Card({title, subtitle, actions, padded = true, className, children, ...rest}: CardProps) {
  return (
    <div className={cn('rounded-2xl bg-surface border border-border-subtle shadow-sm', className)} {...rest}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
            {subtitle && <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(padded && 'p-5', title && padded && 'pt-3')}>{children}</div>
    </div>
  );
}
