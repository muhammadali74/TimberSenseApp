/** WS-I. Capture-activity calendar (weeks × weekdays), single-hue sequential, hover tooltip. */
import {useMemo, useState} from 'react';
import {useChartPalette} from '../lib/palette';
import {TooltipBox} from './ChartTooltip';

const DAY = 86_400_000;
const CELL = 13;
const GAP = 3;

export function CalendarHeatmap({
  counts,
  end,
  weeks = 26,
  unit = 'plots',
}: {
  counts: Map<string, number>;
  end: Date;
  weeks?: number;
  unit?: string;
}) {
  const p = useChartPalette();
  const [hover, setHover] = useState<{key: string; x: number; y: number} | null>(null);
  const {cells, months, max} = useMemo(() => {
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    const start = new Date(last.getTime() - (weeks * 7 - 1) * DAY - last.getUTCDay() * DAY);
    const cells: {key: string; w: number; d: number; n: number}[] = [];
    const months: {w: number; label: string}[] = [];
    let max = 0;
    for (let t = start.getTime(), i = 0; t <= last.getTime(); t += DAY, i++) {
      const dt = new Date(t);
      const key = dt.toISOString().slice(0, 10);
      const n = counts.get(key) ?? 0;
      max = Math.max(max, n);
      const w = Math.floor(i / 7);
      cells.push({key, w, d: dt.getUTCDay(), n});
      if (dt.getUTCDate() === 1) months.push({w, label: dt.toLocaleString('en-US', {month: 'short', timeZone: 'UTC'})});
    }
    return {cells, months, max};
  }, [counts, end, weeks]);
  const level = (n: number) =>
    n === 0 ? 0 : Math.min(p.seq.length - 1, 1 + Math.floor(((n - 1) / Math.max(1, max - 1)) * (p.seq.length - 2)));
  const width = (weeks + 1) * (CELL + GAP);
  const hovered = hover && cells.find((c) => c.key === hover.key);
  return (
    <div className="relative">
      <svg
        viewBox={`-26 -16 ${width + 26} ${7 * (CELL + GAP) + 16}`}
        className="w-full"
        role="img"
        aria-label="Capture activity calendar"
      >
        {months.map((m) => (
          <text key={`${m.label}-${m.w}`} x={m.w * (CELL + GAP)} y={-5} fontSize={9} fill={p.axis}>
            {m.label}
          </text>
        ))}
        {['Mon', 'Wed', 'Fri'].map((d, i) => (
          <text key={d} x={-24} y={(i * 2 + 1) * (CELL + GAP) + CELL - 3} fontSize={9} fill={p.axis}>
            {d}
          </text>
        ))}
        {cells.map((c) => (
          <rect
            key={c.key}
            x={c.w * (CELL + GAP)}
            y={c.d * (CELL + GAP)}
            width={CELL}
            height={CELL}
            rx={3}
            fill={p.seq[level(c.n)]}
            stroke={hover?.key === c.key ? p.axis : 'none'}
            onMouseEnter={(e) => {
              const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              setHover({key: c.key, x: e.clientX - r.left, y: e.clientY - r.top});
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-fg-muted">
        Less
        {p.seq.map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{background: c}} />
        ))}
        More
      </div>
      {hover && hovered && (
        <div className="absolute z-20" style={{left: Math.min(hover.x + 10, 260), top: hover.y + 12}}>
          <TooltipBox
            title={new Date(hovered.key).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
            rows={[{label: 'Captured', value: `${hovered.n} ${unit}`}]}
          />
        </div>
      )}
    </div>
  );
}
