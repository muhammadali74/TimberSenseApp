/** WS-H. Full-height card that hosts WS-I's summary content over the map, with a close button. */
import {X} from 'lucide-react';
import type {ReactNode} from 'react';

export function SummaryOverlay({onClose, children}: {onClose: () => void; children: ReactNode}) {
  return (
    <div className="absolute top-[84px] right-4 bottom-4 left-[372px] z-20 overflow-hidden rounded-2xl border border-border-subtle bg-app-bg-alt shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close summary"
        className="absolute top-3 right-3 z-10 rounded-lg bg-surface p-1.5 text-fg-muted shadow hover:text-fg cursor-pointer"
      >
        <X size={16} />
      </button>
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  );
}
