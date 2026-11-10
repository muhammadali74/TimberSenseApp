/**
 * Phase 0 shell — a plain top bar so every route is reachable.
 * WS-G replaces this with SylvaSense-style floating toolbars, search, region selector,
 * notifications drawer, user menu and a collapsible left rail. Keep the `children` contract:
 * pages render full-bleed inside <main>.
 */
import {LogOut} from 'lucide-react';
import type {ReactNode} from 'react';
import {NavLink} from 'react-router-dom';
import {routes} from '@/app/routes';
import {useSession} from '@/app/session';
import {Logo} from '@/components/ui';
import {cn} from '@/lib/cn';

const NAV = [
  {to: routes.home(), label: 'Map', end: true},
  {to: routes.projects(), label: 'Projects'},
  {to: routes.dashboard(), label: 'Dashboard'},
  {to: routes.reports(), label: 'Reports'},
  {to: routes.devices(), label: 'Devices'},
  {to: routes.team(), label: 'Team'},
  {to: routes.settings(), label: 'Settings'},
  {to: routes.help(), label: 'Help'},
];

export function AppShell({children}: {children: ReactNode}) {
  const {user, logout} = useSession();
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-border-subtle bg-surface px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({isActive}) =>
                cn('rounded-md px-3 py-1.5', isActive ? 'bg-brand-soft text-brand' : 'text-fg-muted hover:text-fg')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {user?.initials}
          </span>
          <button type="button" onClick={logout} className="text-fg-muted hover:text-fg cursor-pointer" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="relative min-h-0 flex-1">{children}</main>
    </div>
  );
}
