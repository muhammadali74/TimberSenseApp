/**
 * WS-I. Horizontal bar list in plain HTML: label · bar · value. One measure across categories,
 * so a single hue unless an item carries its own (entity) colour. Hover shows a tooltip.
 */
import {type ReactNode, useState} from 'react';
import {TooltipBox} from './ChartTooltip';

export interface BarItem {
  id: string;
  label: ReactNode;
  value: number;
  display: string;
  color?: string;
  icon?: ReactNode;
  tooltip?: {label: ReactNode; value: ReactNode}[];
  onClick?: () => void;
}

export function BarList({items, color, max}: {items: BarItem[]; color: string; max?: number}) {
  const [hover, setHover] = useState<{id: string; x: number; y: number} | null>(null);
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  const hovered = items.find((i) => i.id === hover?.id);
  return (
    <div className="relative">
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li
            key={it.id}
            onMouseMove={(e) => {
              const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              setHover({id: it.id, x: e.clientX - r.left, y: e.clientY - r.top});
            }}
            onMouseLeave={() => setHover(null)}
            onClick={it.onClick}
            className={it.onClick ? 'cursor-pointer' : undefined}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-fg">
                {it.icon}
                {it.label}
              </span>
              <span className="fd-mono shrink-0 text-fg">{it.display}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--fd-ghost,var(--color-surface-3))]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: it.value > 0 ? `${Math.max(1.5, (it.value / top) * 100)}%` : 0,
                  background: it.color ?? color,
                  opacity: hover && hover.id !== it.id ? 0.55 : 1,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {hover && hovered?.tooltip && (
        <div className="absolute z-20" style={{left: Math.min(hover.x + 12, 200), top: hover.y + 12}}>
          <TooltipBox title={hovered.label} rows={hovered.tooltip} />
        </div>
      )}
    </div>
  );
}
