/** WS-G. Global search over the catalog: projects, blocks and plots. Press "/" to focus. */
import {Boxes, FolderTree, MapPin, Search} from 'lucide-react';
import {type KeyboardEvent, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {catalog} from '@/data/catalog';
import {allPlots} from '@/lib/aggregate';
import {cn} from '@/lib/cn';
import {NavCard} from './NavCard';

interface Result {
  kind: 'project' | 'block' | 'plot';
  label: string;
  meta: string;
  to: string;
}

const ICONS = {project: FolderTree, block: Boxes, plot: MapPin};

function buildIndex(): Result[] {
  const out: Result[] = [];
  for (const p of catalog) {
    out.push({kind: 'project', label: p.name, meta: `${p.region} · ${p.client}`, to: routes.project(p.id)});
    for (const b of p.blocks) out.push({kind: 'block', label: b.name, meta: p.name, to: routes.block(p.id, b.id)});
  }
  for (const {project, block, plot} of allPlots()) {
    out.push({
      kind: 'plot',
      label: plot.name,
      meta: `${block.name} · ${plot.dataPath ? '3D available' : plot.status}`,
      to: routes.plot(project.id, block.id, plot.id),
    });
  }
  return out;
}

export function HeaderSearch() {
  const navigate = useNavigate();
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return index.filter((r) => r.kind === 'project').slice(0, 6);
    return index.filter((r) => `${r.label} ${r.meta}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, index]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement)?.closest('input, textarea, select')) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (r: Result) => {
    navigate(r.to);
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    }
  };

  return (
    <div className="pointer-events-auto relative">
      <NavCard className="w-[230px] px-3 xl:w-[260px]">
        <Search size={16} className="shrink-0 text-fg-subtle" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Search projects, blocks, plots"
          aria-label="Search"
          className="ml-2 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-fg-subtle"
        />
        <kbd className="rounded border border-border px-1.5 text-[10px] text-fg-subtle">/</kbd>
      </NavCard>
      {open && (
        <div className="absolute top-full left-0 z-40 mt-2 w-[340px] overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl">
          <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {q.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Projects'}
          </div>
          {results.length === 0 && <div className="px-3 pb-3 text-sm text-fg-muted">No matches for “{q}”.</div>}
          <ul className="max-h-80 overflow-y-auto pb-1.5">
            {results.map((r, i) => {
              const Icon = ICONS[r.kind];
              return (
                <li key={`${r.kind}-${r.to}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left cursor-pointer',
                      i === active ? 'bg-brand-soft' : 'hover:bg-surface-hover',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg-muted">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-fg">{r.label}</span>
                      <span className="block truncate text-[11px] text-fg-muted">{r.meta}</span>
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-fg-subtle">{r.kind}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
