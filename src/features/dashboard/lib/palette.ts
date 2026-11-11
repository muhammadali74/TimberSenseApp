/**
 * WS-I. Chart colours. Categorical order is fixed (never cycled) and was run through the dataviz
 * validator (light vs #ffffff, dark vs #16261d): lightness band, chroma, CVD and normal-vision
 * separation all pass. Amber is < 3:1 on white, so amber marks always carry visible labels.
 */
import {useShell} from '@/features/shell/shellStore';

const CATEGORICAL_LIGHT = ['#2f9c5a', '#2a78d6', '#eb6834', '#4a3aa7', '#eda100', '#d0457e'];
const CATEGORICAL_DARK = ['#34ad5f', '#3987e5', '#e0703c', '#9085e9', '#c98500', '#e0609a'];

/** Status colours are reserved for state and always shown with a label. */
export const STATUS = {
  good: {light: '#1e8c4d', dark: '#3fe08a'},
  warning: {light: '#d38c00', dark: '#ffcc66'},
  critical: {light: '#e3412b', dark: '#ff6a55'},
  neutral: {light: '#a9b5ad', dark: '#5d6b62'},
} as const;

/** Single-hue sequential ramp (light → strong), for heatmaps. */
const SEQ_LIGHT = ['#e6f4eb', '#bfe3cb', '#86c99e', '#4fae72', '#2f9c5a', '#1b6e3d'];
const SEQ_DARK = ['#16261d', '#1d3a29', '#245a37', '#2f7a47', '#3fa05d', '#4dd07a'];

export interface ChartPalette {
  dark: boolean;
  categorical: string[];
  series: string;
  seq: string[];
  status: Record<keyof typeof STATUS, string>;
  grid: string;
  axis: string;
  surface: string;
}

export function chartPalette(dark: boolean): ChartPalette {
  const pick = (k: keyof typeof STATUS) => (dark ? STATUS[k].dark : STATUS[k].light);
  return {
    dark,
    categorical: dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
    series: dark ? CATEGORICAL_DARK[0] : CATEGORICAL_LIGHT[0],
    seq: dark ? SEQ_DARK : SEQ_LIGHT,
    status: {good: pick('good'), warning: pick('warning'), critical: pick('critical'), neutral: pick('neutral')},
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(20,60,35,0.08)',
    axis: dark ? '#a8aeb8' : '#6b7280',
    surface: dark ? '#16261d' : '#ffffff',
  };
}

export function useChartPalette(): ChartPalette {
  return chartPalette(useShell((s) => s.theme) === 'dark');
}

/** Stable colour for a named entity (species / project): its index in a fixed list, never its rank. */
export function colorFor(list: readonly string[], name: string, p: ChartPalette): string {
  const i = list.indexOf(name);
  return i >= 0 && i < p.categorical.length ? p.categorical[i] : p.status.neutral;
}
