import {Outlet} from 'react-router-dom';
import {AppShell} from '@/features/shell/AppShell';
import {AuthGuard} from './AuthGuard';

/** Authenticated layout. The shell chrome (toolbars, rail) is owned by WS-G in features/shell. */
export function Layout() {
  return (
    <AuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGuard>
  );
}
