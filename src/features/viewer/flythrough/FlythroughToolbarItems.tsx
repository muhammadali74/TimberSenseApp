/** WS-F. Toolbar menu: Orbit plot / Walk between trees / Tree-by-tree tour. */
import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {Clapperboard, Flag, Orbit, Trees} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';
import {ToolbarButton, ToolbarDivider} from '../core/ToolbarButton';
import {type FlythroughPreset, useViewerStore} from '../store';
import {PRESET_LABELS, startFlythrough} from './flythroughUi';

const PRESETS: {id: FlythroughPreset; icon: ReactNode; hint: string}[] = [
  {id: 'orbit', icon: <Orbit size={16} />, hint: 'Rising circle around the whole plot'},
  {id: 'walk', icon: <Trees size={16} />, hint: 'Weave between the stems at eye height'},
  {id: 'tour', icon: <Flag size={16} />, hint: 'Visit the tallest trees, one by one'},
];

export function FlythroughToolbarItems() {
  const active = useViewerStore((s) => s.cameraMode === 'flythrough');
  const current = useViewerStore((s) => s.flythrough.preset);
  return (
    <>
      <ToolbarDivider />
      <Popover className="relative">
        <PopoverButton as={ToolbarButton} label="Cinematic flythrough" active={active}>
          <Clapperboard size={18} />
        </PopoverButton>
        <PopoverPanel
          anchor={{to: 'right start', gap: 12}}
          className="glass-panel z-30 w-64 rounded-xl p-2 text-sm shadow-xl"
        >
          {({close}) => (
            <>
              <div className="px-1 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Cinematic flythrough
              </div>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    close();
                    startFlythrough(p.id);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-hover',
                    active && current === p.id && 'bg-surface-hover',
                  )}
                >
                  <span className="mt-0.5 text-brand">{p.icon}</span>
                  <span>
                    <span className="block font-medium text-fg">{PRESET_LABELS[p.id]}</span>
                    <span className="block text-xs text-fg-muted">{p.hint}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </PopoverPanel>
      </Popover>
    </>
  );
}
