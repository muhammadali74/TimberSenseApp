/** WS-G. TimberSense device fleet (stub). */
import {BatteryCharging, BatteryFull, BatteryLow, Cpu, HardDrive, MapPin, Plus, Radio, RefreshCw} from 'lucide-react';
import {Badge, type BadgeTone, Button, KpiTile} from '@/components/ui';
import {cn} from '@/lib/cn';
import {DEVICE_SENSORS, DEVICES, type DeviceStatus} from '../mockData';
import {toast} from '../toast';
import {PageLayout} from './PageLayout';

const STATUS: Record<DeviceStatus, {tone: BadgeTone; label: string}> = {
  online: {tone: 'success', label: 'Online'},
  capturing: {tone: 'info', label: 'Capturing'},
  charging: {tone: 'warning', label: 'Charging'},
  offline: {tone: 'neutral', label: 'Offline'},
};

const ago = (iso: string) => {
  const h = (Date.now() - new Date(iso).getTime()) / 3.6e6;
  if (h < 1) return `${Math.round(h * 60)} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
};

export function DevicesPage() {
  const totalPlots = DEVICES.reduce((a, d) => a + d.plotsCaptured, 0);
  const totalHours = DEVICES.reduce((a, d) => a + d.hoursCaptured, 0);
  return (
    <PageLayout
      title="Devices"
      subtitle="Your TimberSense capture units — status, storage and sync."
      actions={
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={() => toast('Pairing mode: hold the power button on the device for 3 s', 'info')}
        >
          Pair device
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Devices"
          value={DEVICES.length}
          hint={`${DEVICES.filter((d) => d.status !== 'offline').length} online`}
        />
        <KpiTile label="Plots captured" value={totalPlots} />
        <KpiTile label="Capture hours" value={totalHours.toFixed(1)} />
        <KpiTile label="Firmware" value="2.3.1" hint="2.4 available" tone="farmevo" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {DEVICES.map((d) => {
          const s = STATUS[d.status];
          let Battery = d.battery < 25 ? BatteryLow : BatteryFull;
          if (d.status === 'charging') Battery = BatteryCharging;
          const storagePct = d.storageUsedGb / d.storageTotalGb;
          return (
            <article key={d.id} className="flex flex-col rounded-2xl border border-border-subtle bg-surface p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Radio size={20} />
                  </span>
                  <div>
                    <div className="font-semibold text-fg">{d.name}</div>
                    <div className="text-xs text-fg-muted">{d.model}</div>
                  </div>
                </div>
                <Badge tone={s.tone} dot>
                  {s.label}
                </Badge>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Battery size={16} className={cn(d.battery < 25 ? 'text-danger' : 'text-brand')} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn('h-full rounded-full', d.battery < 25 ? 'bg-danger' : 'bg-brand')}
                      style={{width: `${d.battery}%`}}
                    />
                  </div>
                  <span className="fd-mono w-10 text-right text-xs">{d.battery}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-fg-muted" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn('h-full rounded-full', storagePct > 0.6 ? 'bg-warning' : 'bg-info')}
                      style={{width: `${storagePct * 100}%`}}
                    />
                  </div>
                  <span className="fd-mono w-24 text-right text-xs">
                    {d.storageUsedGb}/{d.storageTotalGb} GB
                  </span>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-fg-muted">Operator</dt>
                <dd className="text-right text-fg">{d.operator}</dd>
                <dt className="text-fg-muted">Last sync</dt>
                <dd className="text-right text-fg">{ago(d.lastSync)}</dd>
                <dt className="text-fg-muted">Firmware</dt>
                <dd className="text-right text-fg">{d.firmware}</dd>
                <dt className="text-fg-muted">Plots captured</dt>
                <dd className="text-right text-fg">{d.plotsCaptured}</dd>
              </dl>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-fg-muted">
                <MapPin size={13} /> {d.location}
              </div>
              <div className="mt-5 flex gap-2 border-t border-border-subtle pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<RefreshCw size={13} />}
                  disabled={d.status === 'offline'}
                  onClick={() => toast(`Syncing ${d.name}…`, 'info')}
                >
                  Sync now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Cpu size={13} />}
                  onClick={() => toast(`Firmware update queued for ${d.name}`)}
                >
                  Update
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold">Sensor payload</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEVICE_SENSORS.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{s.label}</div>
              <div className="mt-1 text-sm text-fg">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
