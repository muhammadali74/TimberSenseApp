/** WS-H. Tooltip card positioned at a map pixel. */
import type {ReactNode} from 'react';

export function MapHoverCard({pixel, children}: {pixel: [number, number] | null; children: ReactNode}) {
  if (!pixel) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs shadow-xl"
      style={{left: pixel[0], top: pixel[1]}}
    >
      {children}
    </div>
  );
}
