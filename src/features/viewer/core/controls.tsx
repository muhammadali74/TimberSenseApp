/** WS-B. Small form controls for viewer popovers. */
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function Field({label, value, children}: {label: string; value?: ReactNode; children: ReactNode}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-fg-muted">{label}</span>
        {value != null && <span className="fd-mono text-fg-subtle">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer accent-[var(--color-brand)] disabled:opacity-40"
    />
  );
}

export function Switch({checked, onChange, label}: {checked: boolean; onChange: (v: boolean) => void; label: string}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between text-xs font-medium text-fg cursor-pointer"
    >
      {label}
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-surface-3')}>
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: {id: T; label: ReactNode}[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-surface-3 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer',
            value === o.id ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
