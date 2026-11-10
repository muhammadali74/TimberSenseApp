/**
 * WS-G. Authenticated app chrome, SylvaSense-style.
 *  - 'overlay' routes (map pages: home, project, block): the header floats over the full-bleed page
 *  - 'bar' routes (everything else): the same controls sit in a solid top bar
 * A route opts into overlay chrome with `handle: {chrome: 'overlay'}` in app/router.tsx.
 * Pages render full-bleed inside <main>.
 */
import {LayoutDashboard, Upload} from 'lucide-react';
import {Fragment, type ReactNode} from 'react';
import {Link, useMatches, useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Logo} from '@/components/ui';
import {cn} from '@/lib/cn';
import {AppsMenu} from './header/AppsMenu';
import {CreditsPill} from './header/CreditsPill';
import {HeaderSearch} from './header/HeaderSearch';
import {NavCard, NavDivider, NavItem} from './header/NavCard';
import {NotificationsButton, NotificationsDrawer} from './header/NotificationsDrawer';
import {ProfileMenu} from './header/ProfileMenu';
import {RegionSelect} from './header/RegionSelect';
import {ShareButton, ShareDialog} from './header/ShareDialog';
import {UploadCaptureModal} from './header/UploadCaptureModal';
import {useShell} from './shellStore';
import {Toaster} from './toast';

export type Chrome = 'overlay' | 'bar';

function useChrome(): Chrome {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i].handle as {chrome?: Chrome} | undefined;
    if (h?.chrome) return h.chrome;
  }
  return 'bar';
}

function HeaderControls() {
  const navigate = useNavigate();
  const setUploadOpen = useShell((s) => s.setUploadOpen);
  return (
    <div className="flex items-center gap-3">
      <NavCard>
        <NavItem icon={<LayoutDashboard size={16} />} onClick={() => navigate(routes.dashboard())}>
          Dashboard
        </NavItem>
      </NavCard>
      <HeaderSearch />
      <NavCard>
        <RegionSelect />
        <NavDivider />
        <NavItem icon={<Upload size={15} />} onClick={() => setUploadOpen(true)}>
          Upload capture
        </NavItem>
      </NavCard>
      <CreditsPill />
      <NavCard>
        <AppsMenu />
        <NotificationsButton />
        <ProfileMenu />
        <ShareButton />
      </NavCard>
    </div>
  );
}

export function AppShell({children}: {children: ReactNode}) {
  const chrome = useChrome();
  // lib/format reads units from a module variable, so re-mount the page when they change.
  const units = useShell((s) => s.units);
  return (
    <div className="flex h-full flex-col bg-app-bg">
      {chrome === 'bar' && (
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-surface-2 px-5">
          <Link to={routes.home()} aria-label="TimberSense home">
            <Logo />
          </Link>
          <HeaderControls />
        </header>
      )}
      <main className="relative min-h-0 flex-1">
        <Fragment key={units}>{children}</Fragment>
        {chrome === 'overlay' && (
          <header
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4 md:px-6',
              'bg-gradient-to-b from-black/35 via-black/10 to-transparent pb-10',
            )}
          >
            <Link to={routes.home()} aria-label="TimberSense home" className="pointer-events-auto mt-1.5">
              <Logo tone="white" className="drop-shadow" />
            </Link>
            <HeaderControls />
          </header>
        )}
      </main>
      <NotificationsDrawer />
      <UploadCaptureModal />
      <ShareDialog />
      <Toaster />
    </div>
  );
}
