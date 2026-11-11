/** WS-G. Plan / credits indicator (stub, like SylvaSense's credits card). */
import {Trees} from 'lucide-react';
import {toast} from '../toast';
import {NavCard} from './NavCard';

export function CreditsPill() {
  return (
    <NavCard className="hidden gap-2 pr-1.5 pl-3 xl:flex">
      <Trees size={16} className="text-brand" />
      <span className="fd-mono text-[13px] font-semibold text-fg">212.4</span>
      <span className="text-[12px] text-fg-muted">ha left</span>
      <button
        type="button"
        onClick={() => toast('Thanks! Our team will reach out about upgrading your plan.', 'info')}
        className="ml-1 h-7 rounded-lg bg-brand px-2.5 text-[12px] font-semibold text-white hover:bg-brand-hover cursor-pointer"
      >
        Upgrade
      </button>
    </NavCard>
  );
}
