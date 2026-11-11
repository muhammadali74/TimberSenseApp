/** WS-I. Species composition donut — 2px surface gaps, legend with direct values, hover tooltip. */
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';
import {colorFor, useChartPalette} from '../lib/palette';
import {ALL_SPECIES} from '../lib/species';
import {TooltipBox} from './ChartTooltip';

export interface SpeciesSlice {
  species: string;
  value: number;
  display: string;
}

export function SpeciesDonut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: SpeciesSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const p = useChartPalette();
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="species"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 1.5 : 0}
              stroke={p.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.species} fill={colorFor(ALL_SPECIES, s.species, p)} />
              ))}
            </Pie>
            <Tooltip
              content={({active, payload}) => {
                const s = active && (payload?.[0]?.payload as SpeciesSlice | undefined);
                if (!s) return null;
                return (
                  <TooltipBox
                    title={s.species}
                    rows={[
                      {
                        label: 'Share',
                        value: `${Math.round((s.value / total) * 100)}%`,
                        color: colorFor(ALL_SPECIES, s.species, p),
                      },
                      {label: 'Value', value: s.display},
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="fd-mono text-lg font-semibold text-fg">{centerValue}</span>
          <span className="text-[10px] text-fg-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((s) => (
          <li key={s.species} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{background: colorFor(ALL_SPECIES, s.species, p)}}
            />
            <span className="min-w-0 flex-1 truncate text-fg">{s.species}</span>
            <span className="fd-mono text-fg-muted">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
