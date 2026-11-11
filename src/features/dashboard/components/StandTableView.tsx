/** WS-I. DBH-class stand table: bar chart of stems/ha by class, with a table view toggle. */
import {useState} from 'react';
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Tabs} from '@/components/ui';
import {fmtNumber} from '@/lib/format';
import {useChartPalette} from '../lib/palette';
import type {StandRow} from '../lib/standTable';
import {TooltipBox} from './ChartTooltip';

export function StandTableView({rows, height = 220}: {rows: StandRow[]; height?: number}) {
  const p = useChartPalette();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  if (!rows.length) return <p className="py-10 text-center text-sm text-fg-muted">No processed plots yet.</p>;
  const total = rows.reduce(
    (a, r) => ({n: a.n + r.stemsPerHa, ba: a.ba + r.basalAreaM2PerHa, v: a.v + r.volumeM3PerHa}),
    {n: 0, ba: 0, v: 0},
  );
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            {id: 'chart', label: 'Chart'},
            {id: 'table', label: 'Table'},
          ]}
        />
      </div>
      {view === 'chart' ? (
        <div style={{height}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{top: 8, right: 4, bottom: 4, left: -12}} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke={p.grid} />
              <XAxis dataKey="cls" tickLine={false} axisLine={false} tick={{fontSize: 10, fill: p.axis}} />
              <YAxis tickLine={false} axisLine={false} tick={{fontSize: 10, fill: p.axis}} width={44} />
              <Tooltip
                cursor={{fill: p.grid}}
                content={({active, payload}) => {
                  const r = active && (payload?.[0]?.payload as StandRow | undefined);
                  if (!r) return null;
                  return (
                    <TooltipBox
                      title={`DBH ${r.label} cm`}
                      rows={[
                        {label: 'Stems', value: `${fmtNumber(r.stemsPerHa)} /ha`},
                        {label: 'Basal area', value: `${fmtNumber(r.basalAreaM2PerHa, 2)} m²/ha`},
                        {label: 'Volume', value: `${fmtNumber(r.volumeM3PerHa, 1)} m³/ha`},
                        {label: 'Share', value: `${Math.round(r.pctStems * 100)}%`},
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="stemsPerHa" fill={p.series} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-[10px] text-fg-subtle">DBH class (cm, 5 cm) · stems per hectare</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="fd-mono w-full text-xs">
            <thead className="text-left text-[11px] text-fg-muted">
              <tr className="border-b border-border-subtle">
                <th className="py-1.5 font-medium">DBH class (cm)</th>
                <th className="py-1.5 text-right font-medium">Stems/ha</th>
                <th className="py-1.5 text-right font-medium">BA m²/ha</th>
                <th className="py-1.5 text-right font-medium">Vol m³/ha</th>
                <th className="py-1.5 text-right font-medium">% stems</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cls} className="border-b border-border-subtle/60">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right">{fmtNumber(r.stemsPerHa)}</td>
                  <td className="py-1.5 text-right">{fmtNumber(r.basalAreaM2PerHa, 2)}</td>
                  <td className="py-1.5 text-right">{fmtNumber(r.volumeM3PerHa, 1)}</td>
                  <td className="py-1.5 text-right">{Math.round(r.pctStems * 100)}%</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right">{fmtNumber(total.n)}</td>
                <td className="py-1.5 text-right">{fmtNumber(total.ba, 2)}</td>
                <td className="py-1.5 text-right">{fmtNumber(total.v, 1)}</td>
                <td className="py-1.5 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
