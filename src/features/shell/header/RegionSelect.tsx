/** WS-G. Region selector; WS-H reads `useShell().region` to filter / fly the map. */
import {Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/react';
import {Check, ChevronDown, Globe2} from 'lucide-react';
import {cn} from '@/lib/cn';
import {REGIONS, useShell} from '../shellStore';
import {NavItem} from './NavCard';

export function RegionSelect() {
  const region = useShell((s) => s.region);
  const setRegion = useShell((s) => s.setRegion);
  const current = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  return (
    <Menu>
      <MenuButton as={NavItem} icon={<Globe2 size={15} className="text-fg-muted" />}>
        {current.label}
        <ChevronDown size={14} className="text-fg-subtle" />
      </MenuButton>
      <MenuItems
        anchor={{to: 'bottom start', gap: 10}}
        className="z-40 w-64 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-2xl outline-none"
      >
        {REGIONS.map((r) => (
          <MenuItem key={r.id}>
            <button
              type="button"
              onClick={() => setRegion(r.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left data-[focus]:bg-surface-hover cursor-pointer',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-fg">{r.label}</span>
                <span className="block text-[11px] text-fg-muted">{r.hint}</span>
              </span>
              {r.id === region && <Check size={15} className="text-brand" />}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
