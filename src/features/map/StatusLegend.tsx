/** WS-H. Bottom-left block-status legend. */
import {BLOCK_STATUS} from './styles';

export function StatusLegend({title = 'Block status'}: {title?: string}) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-4 z-10 rounded-xl border border-border-subtle bg-surface/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{title}</div>
      <div className="flex gap-3">
        {Object.values(BLOCK_STATUS).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-fg">
            <span className="h-2.5 w-2.5 rounded-sm" style={{background: s.color}} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
