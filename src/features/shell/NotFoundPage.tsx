import {Link} from 'react-router-dom';
import {routes} from '@/app/routes';
import {Button} from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="fd-mono text-5xl font-semibold text-brand">404</p>
      <p className="text-sm text-fg-muted">This page doesn’t exist.</p>
      <Link to={routes.home()}>
        <Button variant="primary">Back to map</Button>
      </Link>
    </div>
  );
}
