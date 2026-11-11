/** WS-G. Share the current view: copy link (works) + invite by email (stub). */
import {Copy, Link2, Share2} from 'lucide-react';
import {useState} from 'react';
import {Button, Modal} from '@/components/ui';
import {useShell} from '../shellStore';
import {toast} from '../toast';

export function ShareButton() {
  const open = useShell((s) => s.setShareOpen);
  return (
    <button
      type="button"
      onClick={() => open(true)}
      className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover cursor-pointer"
    >
      <Share2 size={14} /> Share
    </button>
  );
}

export function ShareDialog() {
  const {shareOpen, setShareOpen} = useShell();
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState('view');
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard');
    } catch {
      toast('Copy failed — select the link and copy it manually', 'warning');
    }
  };
  const invite = () => {
    if (!email.includes('@')) return toast('Enter a valid email address', 'warning');
    toast(`Invite sent to ${email}`);
    setEmail('');
  };
  return (
    <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share this view">
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted" htmlFor="share-link">
            Link to this page
          </label>
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3">
              <Link2 size={14} className="shrink-0 text-fg-subtle" />
              <input
                id="share-link"
                readOnly
                value={url}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <Button variant="secondary" icon={<Copy size={14} />} onClick={copy}>
              Copy
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted" htmlFor="share-email">
            Invite people
          </label>
          <div className="flex gap-2">
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-brand"
            />
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
              aria-label="Access level"
            >
              <option value="view">Can view</option>
              <option value="comment">Can comment</option>
              <option value="edit">Can edit</option>
            </select>
            <Button variant="primary" onClick={invite}>
              Invite
            </Button>
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            People outside your workspace get read-only access to this project.
          </p>
        </div>
      </div>
    </Modal>
  );
}
