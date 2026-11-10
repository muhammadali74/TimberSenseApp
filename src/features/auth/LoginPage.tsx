/**
 * Phase 0 login — functional but plain. WS-G replaces the left panel with the animated
 * SylvaSense-style forest panel (rotating stat cards, 3D tree) and adds SSO stubs.
 */
import {Eye, EyeOff} from 'lucide-react';
import {type FormEvent, useState} from 'react';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {DEMO_CREDENTIALS, useSession} from '@/app/session';
import {Button, Logo} from '@/components/ui';

export function LoginPage() {
  const {user, login} = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {from?: string} | null)?.from ?? '/';
  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) navigate(from, {replace: true});
    else setError('Incorrect email or password.');
  };

  return (
    <div className="flex h-full bg-white">
      <div className="hidden flex-1 p-4 lg:block">
        <div className="flex h-full flex-col justify-end rounded-3xl bg-gradient-to-br from-[#3f7a4f] via-[#6a9f72] to-[#c6dcb8] p-10">
          <div className="max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Every tree, measured.</h2>
            <p className="mt-2 text-sm text-fg-muted">
              TimberSense walks the stand with lidar and cameras and returns DBH, height, volume and carbon for every
              stem — in hours, not weeks.
            </p>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-center lg:w-[520px]">
        <form onSubmit={submit} className="w-full max-w-[300px]">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <label className="block text-xs font-medium text-fg-muted" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 mb-4 h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:border-brand"
          />
          <label className="block text-xs font-medium text-fg-muted" htmlFor="password">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-border px-3 pr-10 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-fg-subtle cursor-pointer"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <Button type="submit" variant="dark" className="mt-6 w-full justify-center" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </Button>
          <p className="mt-4 text-center text-[11px] text-fg-subtle">
            Demo: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
          </p>
        </form>
      </div>
    </div>
  );
}
