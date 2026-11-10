/**
 * WS-B. Square icon button for the viewer's left toolbar, with a tooltip to the right.
 * Other workstreams may import this for their `*ToolbarItems` (read-only).
 */
import {type ButtonHTMLAttributes, forwardRef, type ReactNode} from 'react';
import {cn} from '@/lib/cn';

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
  {label, active, className, children, ...rest},
  ref,
) {
  return (
    <span className="group relative flex">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer',
          active ? 'bg-brand text-white shadow-sm' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs text-fg-inverse opacity-0 shadow-lg transition-opacity delay-200 group-hover:opacity-100 group-has-[[data-open]]:hidden">
        {label}
      </span>
    </span>
  );
});

export function ToolbarDivider() {
  return <span className="mx-1.5 my-1 h-px bg-border-subtle" />;
}
