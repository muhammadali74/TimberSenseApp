/** WS-G. Settings — units and theme are functional; the rest are realistic stubs. */
import {useState} from 'react';
import {useSession} from '@/app/session';
import {Button, Tabs} from '@/components/ui';
import {cn} from '@/lib/cn';
import {useShell} from '../shellStore';
import {toast} from '../toast';
import {PageLayout} from './PageLayout';

type Tab = 'profile' | 'display' | 'notifications' | 'workspace';

function Row({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle py-4 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-fg">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-fg-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: {id: T; label: string}[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-surface-3 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer',
            value === o.id ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({defaultOn}: {defaultOn?: boolean}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
        on ? 'bg-brand' : 'bg-surface-3',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

const inputCls =
  'h-10 w-72 rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-brand';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('display');
  const {user} = useSession();
  const {units, setUnits, theme, setTheme} = useShell();
  return (
    <PageLayout title="Settings" subtitle="Your profile, display preferences and workspace.">
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          {id: 'profile', label: 'Profile'},
          {id: 'display', label: 'Units & display'},
          {id: 'notifications', label: 'Notifications'},
          {id: 'workspace', label: 'Workspace'},
        ]}
      />
      <div className="rounded-2xl border border-border-subtle bg-surface px-6 py-2">
        {tab === 'profile' && (
          <>
            <Row label="Full name">
              <input className={inputCls} defaultValue={user?.name} />
            </Row>
            <Row label="Email">
              <input className={inputCls} defaultValue={user?.email} disabled />
            </Row>
            <Row label="Role" hint="Set by the workspace owner">
              <span className="text-sm text-fg">{user?.role}</span>
            </Row>
            <Row label="Password">
              <Button size="sm" onClick={() => toast('Password reset email sent', 'info')}>
                Change password
              </Button>
            </Row>
          </>
        )}
        {tab === 'display' && (
          <>
            <Row label="Measurement units" hint="DBH, heights, areas and volumes everywhere in the app">
              <Choice
                value={units}
                onChange={(u) => {
                  setUnits(u);
                  toast(`Units set to ${u}`);
                }}
                options={[
                  {id: 'metric', label: 'Metric (cm, m, ha)'},
                  {id: 'imperial', label: 'Imperial (in, ft, ac)'},
                ]}
              />
            </Row>
            <Row label="Theme">
              <Choice
                value={theme}
                onChange={setTheme}
                options={[
                  {id: 'light', label: 'Light'},
                  {id: 'dark', label: 'Dark'},
                ]}
              />
            </Row>
            <Row label="Default 3D colour mode" hint="Used when opening a plot">
              <span className="text-sm text-fg">Natural</span>
            </Row>
          </>
        )}
        {tab === 'notifications' && (
          <>
            <Row label="Processing complete" hint="When a capture finishes processing">
              <Toggle defaultOn />
            </Row>
            <Row label="Device alerts" hint="Low battery, storage full, firmware updates">
              <Toggle defaultOn />
            </Row>
            <Row label="Weekly summary email">
              <Toggle />
            </Row>
          </>
        )}
        {tab === 'workspace' && (
          <>
            <Row label="Workspace name">
              <input className={inputCls} defaultValue="Farmevo Technologies" />
            </Row>
            <Row label="Default wood density" hint="Used for biomass when species data is missing">
              <span className="fd-mono text-sm text-fg">500 kg/m³</span>
            </Row>
            <Row label="Carbon fraction" hint="Biomass → carbon">
              <span className="fd-mono text-sm text-fg">0.50</span>
            </Row>
            <Row label="Plan" hint="212.4 ha of cruise credits remaining">
              <Button
                size="sm"
                variant="primary"
                onClick={() => toast('Our team will reach out about your plan', 'info')}
              >
                Manage plan
              </Button>
            </Row>
          </>
        )}
      </div>
    </PageLayout>
  );
}
