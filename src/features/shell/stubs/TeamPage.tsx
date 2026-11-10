/** WS-G. Workspace members (stub invite). */
import {MoreHorizontal, UserPlus} from 'lucide-react';
import {useState} from 'react';
import {Badge, Button, Modal} from '@/components/ui';
import {TEAM, type TeamMember} from '../mockData';
import {toast} from '../toast';
import {PageLayout} from './PageLayout';

const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

const ROLES: TeamMember['role'][] = ['Owner', 'Cruise Manager', 'Forester', 'Field Crew', 'Viewer'];

export function TeamPage() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Field Crew');
  return (
    <PageLayout
      title="Team"
      subtitle="People in the Farmevo Technologies workspace."
      actions={
        <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setOpen(true)}>
          Invite member
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-fg-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Last active</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {TEAM.map((m) => (
              <tr key={m.id} className="hover:bg-surface-hover">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                      {initials(m.name)}
                    </span>
                    <div>
                      <div className="font-medium text-fg">{m.name}</div>
                      <div className="text-xs text-fg-muted">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-fg">{m.role}</td>
                <td className="px-3 py-3">
                  <Badge tone={m.status === 'active' ? 'success' : 'warning'} dot>
                    {m.status === 'active' ? 'Active' : 'Invited'}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-fg-muted">
                  {m.lastActive ? new Date(m.lastActive).toLocaleDateString() : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    className="rounded-md p-1 text-fg-muted hover:bg-surface-3 cursor-pointer"
                    aria-label="More"
                    onClick={() => toast('Member settings are managed by the workspace owner', 'info')}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a team member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!email.includes('@')) return toast('Enter a valid email address', 'warning');
                toast(`Invite sent to ${email} as ${role}`);
                setEmail('');
                setOpen(false);
              }}
            >
              Send invite
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="text-xs font-medium text-fg-muted">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@company.com"
              className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm text-fg outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs font-medium text-fg-muted">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember['role'])}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm text-fg outline-none"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </PageLayout>
  );
}
