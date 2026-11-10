import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

/** CSS-only hover tooltip. For tooltips that follow the cursor (map/3D), render a positioned div instead. */
export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs text-fg-inverse opacity-0 shadow-lg transition-opacity delay-150 group-hover:opacity-100',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2',
          side === 'left' && 'right-full top-1/2 mr-2 -translate-y-1/2',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
        )}
      >
        {content}
      </span>
    </span>
  );
}
