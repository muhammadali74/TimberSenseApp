/** WS-H. Left floating list of projects in the current region. */
import {ChevronDown, FolderTree} from 'lucide-react';
import {useState} from 'react';
import {Badge} from '@/components/ui';
import {summarizeProject} from '@/lib/aggregate';
import {cn} from '@/lib/cn';
import {fmtArea} from '@/lib/format';
import type {Project} from '@/types';
import {PROJECT_STATUS} from './styles';

export function ProjectsList({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute top-[84px] left-4 z-10 w-[300px] overflow-hidden rounded-2xl border border-border-subtle bg-surface/95 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <FolderTree size={16} className="text-brand" />
        <span className="text-sm font-semibold">Projects</span>
        <span className="text-xs text-fg-muted">{projects.length}</span>
        <ChevronDown size={16} className={cn('ml-auto text-fg-subtle transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul className="max-h-[52vh] overflow-y-auto border-t border-border-subtle">
          {projects.map((p) => {
            const s = summarizeProject(p);
            const st = PROJECT_STATUS[p.status];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={cn(
                    'w-full border-b border-border-subtle px-4 py-3 text-left last:border-b-0 cursor-pointer',
                    p.id === selectedId ? 'bg-brand-soft' : 'hover:bg-surface-hover',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] leading-snug font-semibold text-fg">{p.name}</span>
                    <Badge tone={st.tone} className="shrink-0">
                      {st.label}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-muted">
                    {p.region} · {fmtArea(p.areaHa, 1)} · {p.blocks.length} blocks
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-brand" style={{width: `${s.progress * 100}%`}} />
                    </div>
                    <span className="fd-mono text-[10px] text-fg-muted">
                      {s.nPlotsProcessed}/{s.nPlots} plots
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
