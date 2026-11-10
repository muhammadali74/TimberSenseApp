/** WS-G. Bell button with unread badge + slide-over notifications drawer. */
import {Dialog, DialogPanel} from '@headlessui/react';
import {Bell, CheckCheck, Cpu, FileText, Radio, Sparkles, UserPlus, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {cn} from '@/lib/cn';
import type {NotificationKind} from '../mockData';
import {useShell} from '../shellStore';
import {NavItem} from './NavCard';

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  processing: Cpu,
  device: Radio,
  report: FileText,
  team: UserPlus,
  system: Sparkles,
};

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function NotificationsButton() {
  const unread = useShell((s) => s.notifications.filter((n) => !n.read).length);
  const open = useShell((s) => s.setNotificationsOpen);
  return (
    <span className="relative">
      <NavItem icon={<Bell size={17} />} aria-label="Notifications" title="Notifications" onClick={() => open(true)} />
      {unread > 0 && (
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-farmevo px-1 text-[9px] font-bold text-white">
          {unread}
        </span>
      )}
    </span>
  );
}

export function NotificationsDrawer() {
  const {notifications, notificationsOpen, setNotificationsOpen, markAllRead, markRead} = useShell();
  const navigate = useNavigate();
  return (
    <Dialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex p-3">
        <DialogPanel className="flex w-[380px] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl animate-[drawer-in_180ms_ease-out]">
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 className="text-base font-semibold">Notifications</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface-hover cursor-pointer"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="rounded-md p-1 text-fg-muted hover:bg-surface-hover cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markRead(n.id);
                      if (n.href) {
                        setNotificationsOpen(false);
                        navigate(n.href);
                      }
                    }}
                    className={cn(
                      'flex w-full gap-3 border-b border-border-subtle px-5 py-3.5 text-left hover:bg-surface-hover cursor-pointer',
                      !n.read && 'bg-brand-soft/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        n.kind === 'device' ? 'bg-warning-soft text-[#b4730a]' : 'bg-brand-soft text-brand',
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-fg">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-farmevo" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-fg-subtle">{timeAgo(n.time)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
