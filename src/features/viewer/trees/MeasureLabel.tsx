/** WS-C. Small DOM label anchored in 3D (crisp text, unaffected by EDL). */
import {Html} from '@react-three/drei';
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function MeasureLabel({
  position,
  children,
  tone = 'accent',
  className,
}: {
  position: [number, number, number];
  children: ReactNode;
  tone?: 'accent' | 'dark' | 'light' | 'danger';
  className?: string;
}) {
  return (
    <Html position={position} center zIndexRange={[15, 5]} style={{pointerEvents: 'none'}}>
      <div
        className={cn(
          'fd-mono whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold shadow-md',
          tone === 'accent' && 'bg-farmevo text-white',
          tone === 'dark' && 'bg-fg/85 text-white',
          tone === 'light' && 'bg-white/90 text-fg',
          tone === 'danger' && 'bg-danger text-white',
          className,
        )}
      >
        {children}
      </div>
    </Html>
  );
}
