import {cn} from '@/lib/cn';

export function Spinner({size = 20, className}: {size?: number; className?: string}) {
  return (
    <span
      style={{width: size, height: size}}
      className={cn('inline-block animate-spin rounded-full border-2 border-surface-3 border-t-brand', className)}
    />
  );
}
