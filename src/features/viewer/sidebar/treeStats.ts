/** WS-D owns. Pure helpers for the viewer sidebar: histogram binning, sorting, reject reasons, CSV export. */
import type {Tree} from '@/types';

export interface Bin {
  /** inclusive lower edge */
  from: number;
  /** exclusive upper edge */
  to: number;
  count: number;
  label: string;
}

/** Fixed-width bins covering every non-null value; empty bins inside the range are kept so the shape reads correctly. */
export function binValues(values: number[], width: number, unit: string): Bin[] {
  if (!values.length) return [];
  const lo = Math.floor(Math.min(...values) / width) * width;
  const hi = Math.floor(Math.max(...values) / width) * width;
  const bins: Bin[] = [];
  for (let from = lo; from <= hi + 1e-9; from += width) {
    bins.push({from, to: from + width, count: 0, label: `${from}–${from + width} ${unit}`});
  }
  for (const v of values) {
    const i = Math.min(bins.length - 1, Math.floor((v - lo) / width));
    bins[i].count++;
  }
  return bins;
}

export function binIndexOf(bins: Bin[], v: number | null | undefined): number {
  if (v == null) return -1;
  return bins.findIndex((b) => v >= b.from && v < b.to);
}

export type SortKey = 'id' | 'dbhCm' | 'heightM' | 'volumeM3' | 'crownRadiusM';
export type SortDir = 'asc' | 'desc';

/** Sorts a copy; nulls always go last regardless of direction. */
export function sortTrees(trees: Tree[], key: SortKey, dir: SortDir): Tree[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...trees].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va == null && vb == null) return a.id - b.id;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * sign || a.id - b.id;
  });
}

const REJECT_LABELS: Record<string, string> = {
  too_short: 'Too short',
  no_dbh_pts: 'No points at breast height',
  sparse: 'Too few stem points',
};

/** 'too_short(hag_p99=0.54m); no_dbh_pts(n=0)' → [{label:'Too short', detail:'hag_p99=0.54m'}, …] */
export function parseRejectReason(reason: string | undefined): {label: string; detail?: string}[] {
  if (!reason) return [{label: 'Rejected'}];
  return reason
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = /^([a-z_]+)(?:\((.*)\))?$/i.exec(part);
      if (!m) return {label: part};
      return {label: REJECT_LABELS[m[1]] ?? m[1].replace(/_/g, ' '), detail: m[2]};
    });
}

const CSV_COLUMNS: [header: string, get: (t: Tree) => unknown][] = [
  ['id', (t) => t.id],
  ['valid', (t) => t.valid],
  ['reject_reason', (t) => t.rejectReason ?? ''],
  ['species', (t) => t.species],
  ['dbh_cm', (t) => t.dbhCm],
  ['dbh_cm_qsm', (t) => t.dbhCmQsm],
  ['dbh_confidence', (t) => t.dbhConfidence ?? ''],
  ['height_m', (t) => t.heightM],
  ['height_m_qsm', (t) => t.heightMQsm],
  ['basal_area_m2', (t) => t.basalAreaM2],
  ['volume_m3', (t) => t.volumeM3],
  ['biomass_kg', (t) => t.biomassKg],
  ['carbon_kg', (t) => t.carbonKg],
  ['co2e_kg', (t) => t.co2eKg],
  ['crown_radius_m', (t) => t.crownRadiusM],
  ['stem_tilt_deg', (t) => t.stemTiltDeg],
  ['nn_dist_m', (t) => t.nnDistM],
  ['nn_id', (t) => t.nnId],
  ['well_spaced', (t) => t.wellSpaced],
  ['thin_remove', (t) => t.thinRemove],
  ['qsm_status', (t) => t.qsmStatus],
  ['n_points', (t) => t.nPoints],
  ['base_x', (t) => t.base[0]],
  ['base_y', (t) => t.base[1]],
  ['base_z', (t) => t.base[2]],
];

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Always metric (column names carry the unit), so exports are stable regardless of the display setting. */
export function treesToCsv(trees: Tree[]): string {
  const rows = [CSV_COLUMNS.map(([h]) => h).join(',')];
  for (const t of trees) rows.push(CSV_COLUMNS.map(([, get]) => csvCell(get(t))).join(','));
  return `${rows.join('\n')}\n`;
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], {type: `${mime};charset=utf-8`}));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
