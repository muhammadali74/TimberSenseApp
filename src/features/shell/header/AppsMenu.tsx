/** WS-G. Module launcher (all sections of the portal). */
import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {
  CircleHelp,
  FileText,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  Map as MapIcon,
  Radio,
  Settings,
  Users,
} from 'lucide-react';
import {NavLink} from 'react-router-dom';
import {routes} from '@/app/routes';
import {cn} from '@/lib/cn';
import {NavItem} from './NavCard';

export const MODULES = [
  {to: routes.home(), label: 'Map', hint: 'All projects on the globe', icon: MapIcon, end: true},
  {to: routes.projects(), label: 'Projects', hint: 'Cruises, blocks & plots', icon: FolderTree},
  {to: routes.dashboard(), label: 'Dashboard', hint: 'Operations at a glance', icon: LayoutDashboard},
  {to: routes.reports(), label: 'Reports', hint: 'Cruise & carbon reports', icon: FileText},
  {to: routes.devices(), label: 'Devices', hint: 'TimberSense fleet', icon: Radio},
  {to: routes.team(), label: 'Team', hint: 'Members & roles', icon: Users},
  {to: routes.settings(), label: 'Settings', hint: 'Workspace & units', icon: Settings},
  {to: routes.help(), label: 'Help', hint: 'Guides & support', icon: CircleHelp},
];

export function AppsMenu() {
  return (
    <Popover>
      <PopoverButton as={NavItem} icon={<LayoutGrid size={17} />} aria-label="All modules" title="All modules" />
      <PopoverPanel
        anchor={{to: 'bottom end', gap: 10}}
        className="z-40 w-[360px] rounded-2xl border border-border-subtle bg-surface p-2 shadow-2xl outline-none"
      >
        {({close}) => (
          <div className="grid grid-cols-2 gap-1">
            {MODULES.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                onClick={() => close()}
                className={({isActive}) =>
                  cn('flex items-center gap-3 rounded-xl p-2.5', isActive ? 'bg-brand-soft' : 'hover:bg-surface-hover')
                }
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <m.icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-fg">{m.label}</span>
                  <span className="block truncate text-[11px] text-fg-muted">{m.hint}</span>
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
