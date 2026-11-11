/** WS-G. Login — SylvaSense split layout: feature carousel left, form right. Demo credentials only. */
import {Eye, EyeOff, Loader2} from 'lucide-react';
import {type FormEvent, useState} from 'react';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {DEMO_CREDENTIALS, useSession} from '@/app/session';
import {Logo, Modal} from '@/components/ui';
import {cn} from '@/lib/cn';
import {FeatureCarousel} from './FeatureCarousel';

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand focus:ring-2 focus:ring-brand/15';

function SsoButton({icon, label, onClick}: {icon: React.ReactNode; label: string; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-surface-hover cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

const GoogleIcon = (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
);

const MicrosoftIcon = (
  <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

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
  const [info, setInfo] = useState<{title: string; body: string} | null>(null);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) navigate(from, {replace: true});
    else setError('Incorrect email or password. Use the demo credentials below.');
  };

  const sso = (provider: string) =>
    setInfo({
      title: `Sign in with ${provider}`,
      body: `Single sign-on isn’t enabled for this demo workspace. Use the demo account instead.`,
    });

  return (
    <div className="flex h-full min-h-screen w-full bg-surface">
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] xl:w-[58%]">
        <FeatureCarousel />
      </div>
      <div className="w-full overflow-y-auto md:w-1/2 lg:w-[45%] xl:w-[42%]">
        <div className="flex min-h-full items-center justify-center px-8 py-12 md:px-12 lg:px-16">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 flex flex-col items-center">
              <Logo variant="mark" className="h-11 w-11" />
              <h1 className="mt-4 text-2xl font-semibold">TimberSense</h1>
              <p className="mt-2 text-center text-sm text-fg-muted">
                New to TimberSense?{' '}
                <a href="https://farmevo.ai" target="_blank" rel="noreferrer" className="font-medium text-fg underline">
                  Request a demo
                </a>
              </p>
            </div>

            <form onSubmit={submit} className="grid gap-4">
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="Email address*"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password*"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputCls, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-fg-subtle hover:text-fg cursor-pointer"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  setInfo({
                    title: 'Reset your password',
                    body: 'Password resets are handled by your workspace admin. For this demo, use the credentials shown below the form.',
                  })
                }
                className="w-fit text-sm font-medium text-fg-muted underline hover:text-fg cursor-pointer"
              >
                Forgot password?
              </button>
              {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-fg text-sm font-semibold text-fg-inverse hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {busy ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-fg-subtle">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-3">
              <SsoButton icon={GoogleIcon} label="Sign in with Google" onClick={() => sso('Google')} />
              <SsoButton icon={MicrosoftIcon} label="Sign in with Microsoft" onClick={() => sso('Microsoft')} />
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-center text-xs text-fg-muted">
              Demo account · <span className="fd-mono text-fg">{DEMO_CREDENTIALS.email}</span> /{' '}
              <span className="fd-mono text-fg">{DEMO_CREDENTIALS.password}</span>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 text-sm text-fg-muted">
              <a href="https://farmevo.ai" target="_blank" rel="noreferrer" className="hover:text-fg">
                Terms of use
              </a>
              <span className="text-fg-subtle">|</span>
              <a href="https://farmevo.ai" target="_blank" rel="noreferrer" className="hover:text-fg">
                Privacy policy
              </a>
            </div>
          </div>
        </div>
      </div>
      <Modal open={!!info} onClose={() => setInfo(null)} title={info?.title} size="sm">
        <p className="text-sm text-fg-muted">{info?.body}</p>
      </Modal>
    </div>
  );
}
