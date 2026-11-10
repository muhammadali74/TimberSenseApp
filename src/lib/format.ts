/**
 * All user-visible number formatting goes through here so the metric/imperial switch works everywhere.
 * Values are always stored in metric; `units` only affects display.
 */
export type Units = 'metric' | 'imperial';

let currentUnits: Units = 'metric';
export const setUnits = (u: Units) => {
  currentUnits = u;
};
export const getUnits = () => currentUnits;

const DASH = '–';
const nf = (v: number, digits: number) =>
  v.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export const fmtNumber = (v: number | null | undefined, digits = 0) => (ok(v) ? nf(v, digits) : DASH);
export const fmtPercent = (v: number | null | undefined, digits = 0) => (ok(v) ? `${nf(v * 100, digits)}%` : DASH);

/** Format a metric value, converting with `toImperial` when imperial units are selected. */
function withUnits(
  v: number | null | undefined,
  digits: number,
  metricUnit: string,
  imperialUnit: string,
  toImperial: (x: number) => number,
): string {
  if (!ok(v)) return DASH;
  if (currentUnits === 'metric') return `${nf(v, digits)} ${metricUnit}`;
  return `${nf(toImperial(v), digits)} ${imperialUnit}`;
}

export const fmtDbh = (cm: number | null | undefined, digits = 1) => withUnits(cm, digits, 'cm', 'in', (x) => x / 2.54);
export const fmtHeight = (m: number | null | undefined, digits = 1) =>
  withUnits(m, digits, 'm', 'ft', (x) => x * 3.28084);
export const fmtDistance = fmtHeight;
export const fmtArea = (ha: number | null | undefined, digits = 2) =>
  withUnits(ha, digits, 'ha', 'ac', (x) => x * 2.47105);
export const fmtAreaM2 = (m2: number | null | undefined, digits = 0) =>
  withUnits(m2, digits, 'm²', 'ft²', (x) => x * 10.7639);
export const fmtVolume = (m3: number | null | undefined, digits = 2) =>
  withUnits(m3, digits, 'm³', 'ft³', (x) => x * 35.3147);
export const fmtVolumePerHa = (m3ha: number | null | undefined, digits = 1) =>
  withUnits(m3ha, digits, 'm³/ha', 'ft³/ac', (x) => x * 14.2913);
export const fmtBasalArea = (m2ha: number | null | undefined, digits = 1) =>
  withUnits(m2ha, digits, 'm²/ha', 'ft²/ac', (x) => x * 4.356);
export const fmtStemsPerHa = (sph: number | null | undefined) => withUnits(sph, 0, '/ha', '/ac', (x) => x / 2.47105);

export const fmtMass = (kg: number | null | undefined) => {
  if (!ok(kg)) return DASH;
  return kg >= 1000 ? `${nf(kg / 1000, 2)} t` : `${nf(kg, 0)} kg`;
};

export const fmtTonnes = (t: number | null | undefined, digits = 1) => (ok(t) ? `${nf(t, digits)} t` : DASH);

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}) : DASH;

export const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};
