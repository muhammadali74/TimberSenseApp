/**
 * WS-D owns. Searchable, sortable list of trees. Hovering a row highlights the tree in 3D (hoverTree);
 * clicking selects it and asks the camera to frame it.
 */
import {ArrowDown, ArrowUp, Scissors, Search} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Tabs} from '@/components/ui';
import {cn} from '@/lib/cn';
import {fmtDbh, fmtHeight, fmtVolume} from '@/lib/format';
import type {Tree} from '@/types';
import {useViewerStore} from '../store';
import {type SortDir, type SortKey, sortTrees} from './treeStats';

type Filter = 'all' | 'thin' | 'spacing';

const COLUMNS: {key: SortKey; label: string; cell: (t: Tree) => string}[] = [
  {key: 'id', label: 'ID', cell: (t) => String(t.id)},
  {key: 'dbhCm', label: 'DBH', cell: (t) => fmtDbh(t.dbhCm)},
  {key: 'heightM', label: 'Height', cell: (t) => fmtHeight(t.heightM)},
  {key: 'volumeM3', label: 'Volume', cell: (t) => fmtVolume(t.volumeM3)},
];

export function TreeTable({trees}: {trees: Tree[]}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{key: SortKey; dir: SortDir}>({key: 'dbhCm', dir: 'desc'});

  const hoveredId = useViewerStore((s) => s.hoveredTreeId);
  const hoverTree = useViewerStore((s) => s.hoverTree);
  const selectTree = useViewerStore((s) => s.selectTree);
  const requestCamera = useViewerStore((s) => s.requestCamera);

  const rows = useMemo(() => {
    const q = query.trim();
    const filtered = trees.filter(
      (t) =>
        t.valid &&
        (!q || String(t.id).includes(q)) &&
        (filter === 'all' || (filter === 'thin' ? t.thinRemove : !t.wellSpaced)),
    );
    return sortTrees(filtered, sort.key, sort.dir);
  }, [trees, query, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? {key, dir: s.dir === 'asc' ? 'desc' : 'asc'} : {key, dir: key === 'id' ? 'asc' : 'desc'},
    );

  const open = (id: number) => {
    selectTree(id);
    requestCamera({kind: 'focusTree', id});
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="flex h-8 flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-xs focus-within:border-brand">
          <Search size={14} className="text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, ''))}
            placeholder="Find tree ID"
            inputMode="numeric"
            className="w-full bg-transparent outline-none placeholder:text-fg-subtle"
          />
        </label>
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          items={[
            {id: 'all', label: 'All'},
            {id: 'thin', label: 'Thin'},
            {id: 'spacing', label: 'Crowded'},
          ]}
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-border-subtle">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-2 text-fg-muted">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-2 py-1.5 text-right font-medium first:text-left">
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-0.5 hover:text-fg',
                      sort.key === c.key && 'text-fg',
                    )}
                  >
                    {c.label}
                    {sort.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                </th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>
          <tbody className="fd-mono">
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => open(t.id)}
                onMouseEnter={() => hoverTree(t.id)}
                onMouseLeave={() => hoverTree(null)}
                className={cn(
                  'cursor-pointer border-t border-border-subtle',
                  hoveredId === t.id ? 'bg-brand-soft' : 'hover:bg-surface-hover',
                )}
              >
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-right first:text-left">
                    {c.cell(t)}
                  </td>
                ))}
                <td className="pr-2 text-danger">{t.thinRemove && <Scissors size={12} aria-label="Thin" />}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-2 py-4 text-center font-sans text-fg-subtle">
                  No trees match
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-fg-subtle">
        {rows.length} of {trees.filter((t) => t.valid).length} measured trees
      </div>
    </div>
  );
}
