import type {ReactNode} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useSession} from './session';

export function AuthGuard({children}: {children: ReactNode}) {
  const user = useSession((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{from: location.pathname + location.search}} />;
  return <>{children}</>;
}
