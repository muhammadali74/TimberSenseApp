/** WS-G. SylvaSense-style floating white card that groups header controls. */
import {type ButtonHTMLAttributes, forwardRef, type HTMLAttributes, type ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function NavCard({className, children, ...rest}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex h-11 items-center gap-0.5 rounded-xl border border-border-subtle bg-surface px-1.5 shadow-[0_2px_10px_var(--color-shadow-soft)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  active?: boolean;
}

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(function NavItem(
  {icon, active, className, children, ...rest},
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer',
        active ? 'bg-brand-soft text-brand' : 'text-fg hover:bg-surface-hover',
        !children && 'w-8 justify-center px-0',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function NavDivider() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}
