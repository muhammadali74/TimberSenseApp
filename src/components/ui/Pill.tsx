import type {HTMLAttributes} from 'react';
import {cn} from '@/lib/cn';

/** Floating white toolbar group, as used over the satellite map / 3D canvas (SylvaSense style). */
export function Pill({className, children, ...rest}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-panel flex items-center gap-1 rounded-xl px-1.5 py-1 text-sm', className)} {...rest}>
      {children}
    </div>
  );
}
