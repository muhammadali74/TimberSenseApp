/** WS-D owns. Small Recharts histogram of a per-tree metric; the bin holding the hovered/selected tree is highlighted. */
import {useMemo} from 'react';
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {Tree} from '@/types';
import {useViewerStore} from '../store';
import {binIndexOf, binValues} from './treeStats';

export interface TreeHistogramProps {
  trees: Tree[];
  value: (t: Tree) => number | null;
  binWidth: number;
  unit: string;
}

export function TreeHistogram({trees, value, binWidth, unit}: TreeHistogramProps) {
  const bins = useMemo(() => {
    const values = trees.filter((t) => t.valid).flatMap((t) => (value(t) == null ? [] : [value(t) as number]));
    return binValues(values, binWidth, unit);
  }, [trees, value, binWidth, unit]);

  const focusId = useViewerStore((s) => s.hoveredTreeId ?? s.selectedTreeId);
  const focusTree = focusId != null ? trees.find((t) => t.id === focusId) : undefined;
  const focusBin = focusTree ? binIndexOf(bins, value(focusTree)) : -1;

  if (!bins.length) return <div className="py-6 text-center text-xs text-fg-subtle">No measured trees</div>;

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{top: 4, right: 4, bottom: 0, left: -24}} barCategoryGap={2}>
          <XAxis
            dataKey="from"
            tick={{fontSize: 10, fill: 'var(--color-fg-subtle)'}}
            tickLine={false}
            axisLine={{stroke: 'var(--color-border)'}}
          />
          <YAxis
            allowDecimals={false}
            tick={{fontSize: 10, fill: 'var(--color-fg-subtle)'}}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{fill: 'var(--color-surface-3)'}}
            content={({active, payload}) => {
              const b = active && payload?.[0]?.payload;
              if (!b) return null;
              return (
                <div className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs shadow-sm">
                  <div className="text-fg-muted">{b.label}</div>
                  <div className="fd-mono font-semibold">
                    {b.count} tree{b.count === 1 ? '' : 's'}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {bins.map((b, i) => (
              <Cell key={b.from} fill={i === focusBin ? 'var(--color-farmevo)' : 'var(--color-brand)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
