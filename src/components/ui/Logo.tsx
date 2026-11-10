import FarmevoMark from '@/assets/brand/farmevo-mark.svg?react';
import FarmevoWordmark from '@/assets/brand/farmevo-wordmark.svg?react';
import {cn} from '@/lib/cn';

const TONE_CLASS = {farmevo: 'text-farmevo', white: 'text-white', dark: 'text-fg'} as const;

/** Farmevo mark + "TimberSense" product name. `tone` sets the logo colour (orange by default). */
export function Logo({
  variant = 'product',
  tone = 'farmevo',
  className,
}: {
  variant?: 'product' | 'wordmark' | 'mark';
  tone?: 'farmevo' | 'white' | 'dark';
  className?: string;
}) {
  const color = TONE_CLASS[tone];
  if (variant === 'mark') return <FarmevoMark className={cn('h-7 w-7 fill-current', color, className)} />;
  if (variant === 'wordmark') return <FarmevoWordmark className={cn('h-6 w-auto fill-current', color, className)} />;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <FarmevoMark className={cn('h-7 w-7 fill-current', color)} />
      <span className="leading-tight">
        <span
          className={cn('block text-[15px] font-semibold tracking-tight', tone === 'white' ? 'text-white' : 'text-fg')}
        >
          TimberSense
        </span>
        <span className={cn('block text-[10px] font-medium uppercase tracking-[0.16em]', color)}>by farmevo</span>
      </span>
    </span>
  );
}
