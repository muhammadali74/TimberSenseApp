/** WS-B. Bottom-left legend for the active colour mode. */
import {useMemo} from 'react';
import {fmtNumber} from '@/lib/format';
import {usePlotData} from '../PlotDataContext';
import {useViewerStore} from '../store';
import {CLASS_COLORS, cssGradient, HEIGHT_RAMP, METRIC_RAMP} from './colors';
import {METRIC_INFO, metricRange} from './metrics';

function Ramp({
  stops,
  min,
  max,
  unit,
  title,
}: {
  stops: readonly string[];
  min: string;
  max: string;
  unit: string;
  title: string;
}) {
  return (
    <div className="w-52">
      <div className="mb-1.5 text-[11px] font-semibold text-fg">{title}</div>
      <div className="h-2 rounded-full" style={{background: cssGradient(stops)}} />
      <div className="mt-1 flex justify-between fd-mono text-[10px] text-fg-muted">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

export function ColorLegend() {
  const {trees} = usePlotData();
  const colorMode = useViewerStore((s) => s.colorMode);
  const metric = useViewerStore((s) => s.metric);
  const tallest = useMemo(() => trees.reduce((m, t) => Math.max(m, t.heightM ?? 0), 0) * 1.05, [trees]);
  const range = useMemo(() => metricRange(trees, metric), [trees, metric]);
  const nValid = trees.filter((t) => t.valid).length;

  let body: React.ReactNode = null;
  if (colorMode === 'semantic') {
    body = (
      <div className="flex gap-3 text-[11px] font-medium text-fg">
        {(Object.entries(CLASS_COLORS) as [string, string][]).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5 capitalize">
            <span className="h-2.5 w-2.5 rounded-full" style={{background: c}} />
            {k === 'leaves' ? 'Foliage' : k}
          </span>
        ))}
      </div>
    );
  } else if (colorMode === 'height') {
    body = <Ramp title="Height above ground" stops={HEIGHT_RAMP} min="0" max={fmtNumber(tallest, 1)} unit="m" />;
  } else if (colorMode === 'metric') {
    const info = METRIC_INFO[metric];
    const digits = metric === 'volume' ? 2 : 1;
    body = (
      <Ramp
        title={`Tree ${info.label.toLowerCase()}`}
        stops={METRIC_RAMP}
        min={fmtNumber(range.min, digits)}
        max={fmtNumber(range.max, digits)}
        unit={info.unit}
      />
    );
  } else if (colorMode === 'instance') {
    body = (
      <div className="text-[11px] text-fg">
        <span className="font-semibold">{nValid} trees</span>{' '}
        <span className="text-fg-muted">· one colour per tree</span>
      </div>
    );
  }
  if (!body) return null;
  return <div className="glass-panel pointer-events-auto rounded-xl px-3 py-2">{body}</div>;
}
