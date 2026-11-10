/** WS-I. Shared tooltip look (Recharts content + HTML charts). */
import type {ReactNode} from 'react';

export function TooltipBox({
  title,
  rows,
}: {
  title: ReactNode;
  rows: {label: ReactNode; value: ReactNode; color?: string}[];
}) {
  return (
    <div className="pointer-events-none min-w-36 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-fg">{title}</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-fg-muted">
            {r.color && <span className="h-2 w-2 rounded-sm" style={{background: r.color}} />}
            {r.label}
          </span>
          <span className="fd-mono text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
