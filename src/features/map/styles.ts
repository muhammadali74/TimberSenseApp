/** WS-H. Shared map colours and OpenLayers style helpers. */
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import type {BlockStatus, PlotStatus, ProjectStatus} from '@/types';

export const BLOCK_STATUS: Record<BlockStatus, {label: string; color: string}> = {
  cruised: {label: 'Cruised', color: '#2f9c5a'},
  in_progress: {label: 'In progress', color: '#feb743'},
  pending: {label: 'Pending', color: '#8fa3b8'},
};

export const PLOT_STATUS: Record<PlotStatus, {label: string; color: string}> = {
  processed: {label: 'Processed', color: '#2f9c5a'},
  captured: {label: 'Captured · processing', color: '#3b82f6'},
  pending: {label: 'Not captured', color: '#94a3b8'},
};

export const PROJECT_STATUS: Record<ProjectStatus, {label: string; tone: 'brand' | 'info' | 'neutral'}> = {
  active: {label: 'Active', tone: 'brand'},
  completed: {label: 'Completed', tone: 'info'},
  planned: {label: 'Planned', tone: 'neutral'},
};

/** Badge tones for statuses. */
export const BLOCK_TONE: Record<BlockStatus, 'success' | 'warning' | 'neutral'> = {
  cruised: 'success',
  in_progress: 'warning',
  pending: 'neutral',
};
export const PLOT_TONE: Record<PlotStatus, 'success' | 'info' | 'neutral'> = {
  processed: 'success',
  captured: 'info',
  pending: 'neutral',
};

/** Count items by a key. */
export function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Sequential green ramp for metric choropleths (low → high). */
export const METRIC_RAMP = ['#e3f1e7', '#a8d5b5', '#62b37e', '#2f9c5a', '#16592f'];

export function rampColor(t: number): string {
  const x = Math.min(0.9999, Math.max(0, t)) * (METRIC_RAMP.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = hex(METRIC_RAMP[i]);
  const b = hex(METRIC_RAMP[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

export function hex(h: string): [number, number, number] {
  const v = Number.parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function withAlpha(color: string, a: number): string {
  if (color.startsWith('#')) return `rgba(${hex(color).join(',')},${a})`;
  return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
}

const FONT = '600 12px Poppins, sans-serif';

/** White numbered bubble (SylvaSense cluster style). */
export function bubbleStyle(count: number, opts: {selected?: boolean; accent?: string} = {}) {
  const r = count >= 10 ? 15 : 13;
  return new Style({
    image: new CircleStyle({
      radius: r,
      fill: new Fill({color: '#ffffff'}),
      stroke: new Stroke({
        color: opts.selected ? '#2f9c5a' : (opts.accent ?? 'rgba(0,0,0,0.12)'),
        width: opts.selected ? 3 : 2,
      }),
    }),
    text: new Text({text: String(count), font: FONT, fill: new Fill({color: '#0a0a0a'})}),
  });
}

export function polygonStyle(
  fill: string,
  stroke: string,
  opts: {width?: number; label?: string; dashed?: boolean} = {},
) {
  return new Style({
    fill: new Fill({color: fill}),
    stroke: new Stroke({color: stroke, width: opts.width ?? 2, lineDash: opts.dashed ? [6, 4] : undefined}),
    text: opts.label
      ? new Text({
          text: opts.label,
          font: '600 11px Poppins, sans-serif',
          fill: new Fill({color: '#ffffff'}),
          stroke: new Stroke({color: 'rgba(0,0,0,0.65)', width: 3}),
          overflow: true,
        })
      : undefined,
  });
}
