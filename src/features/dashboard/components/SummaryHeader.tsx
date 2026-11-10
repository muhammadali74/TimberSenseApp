/** WS-I. Title row for summary views with export actions. */
import {FileDown, FileText} from 'lucide-react';
import type {ReactNode} from 'react';
import {Button} from '@/components/ui';
import {toast} from '@/features/shell/toast';

export function SummaryHeader({
  eyebrow,
  title,
  subtitle,
  onCsv,
  csvLabel = 'Export CSV',
  extra,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  onCsv: () => void;
  csvLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 pr-10">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>}
      </div>
      <div className="flex gap-2">
        {extra}
        <Button size="sm" icon={<FileDown size={14} />} onClick={onCsv}>
          {csvLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<FileText size={14} />}
          onClick={() => toast('PDF report queued — it will appear in Reports', 'info')}
        >
          PDF
        </Button>
      </div>
    </div>
  );
}
