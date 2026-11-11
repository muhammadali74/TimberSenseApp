/** WS-I. CSV export (works — creates a real file download). */
export type CsvRow = Record<string, string | number | null | undefined>;

export function toCsv(rows: CsvRow[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: CsvRow[string]) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : v;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const blob = new Blob([toCsv(rows)], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
