/** WS-G. Reports library (stub downloads). */
import {Download, FileSpreadsheet, FileText, Loader2, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Badge, Button, Tabs} from '@/components/ui';
import {fmtDate} from '@/lib/format';
import {REPORTS, type ReportType} from '../mockData';
import {toast} from '../toast';
import {PageLayout} from './PageLayout';

type Filter = 'all' | ReportType;
const FILTERS: Filter[] = ['all', 'Cruise report', 'Stand table', 'Tree list', 'Carbon summary', 'Thinning plan'];

export function ReportsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const rows = useMemo(() => REPORTS.filter((r) => filter === 'all' || r.type === filter), [filter]);
  return (
    <PageLayout
      title="Reports"
      subtitle="Cruise reports, stand tables, tree lists and carbon summaries generated from your captures."
      actions={
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => toast('Report builder is coming soon', 'info')}
        >
          New report
        </Button>
      }
    >
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={FILTERS.map((f) => ({id: f, label: f === 'all' ? 'All' : f}))}
      />
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-fg-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Report</th>
              <th className="px-3 py-3 font-medium">Project</th>
              <th className="px-3 py-3 font-medium">Scope</th>
              <th className="px-3 py-3 font-medium">Created</th>
              <th className="px-3 py-3 text-right font-medium">Size</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((r) => {
              const Icon = r.format === 'PDF' ? FileText : FileSpreadsheet;
              return (
                <tr key={r.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Icon size={16} />
                      </span>
                      <div>
                        <div className="font-medium text-fg">{r.title}</div>
                        <div className="text-xs text-fg-muted">
                          {r.type} · {r.format}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{r.project}</td>
                  <td className="px-3 py-3">
                    <Badge>{r.scope}</Badge>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{fmtDate(r.created)}</td>
                  <td className="fd-mono px-3 py-3 text-right text-fg-muted">
                    {r.sizeKb >= 1000 ? `${(r.sizeKb / 1000).toFixed(1)} MB` : `${r.sizeKb} KB`}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === 'generating' ? (
                      <Badge tone="info">
                        <Loader2 size={11} className="animate-spin" /> Generating
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Download size={14} />}
                        onClick={() => toast(`Downloading ${r.title}`)}
                      >
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
