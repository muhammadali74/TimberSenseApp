/** WS-G. Avatar menu: account, quick preferences (units, theme), sign out. */
import {Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/react';
import {CircleHelp, LogOut, Moon, Ruler, Settings, Sun, Users} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {routes} from '@/app/routes';
import {useSession} from '@/app/session';
import {useShell} from '../shellStore';

const itemCls =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg data-[focus]:bg-surface-hover cursor-pointer';

export function ProfileMenu() {
  const {user, logout} = useSession();
  const navigate = useNavigate();
  const {units, setUnits, theme, setTheme} = useShell();
  if (!user) return null;
  return (
    <Menu>
      <MenuButton
        className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white cursor-pointer"
        aria-label="Account"
      >
        {user.initials}
      </MenuButton>
      <MenuItems
        anchor={{to: 'bottom end', gap: 10}}
        className="z-40 w-64 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-2xl outline-none"
      >
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            {user.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{user.name}</div>
            <div className="truncate text-xs text-fg-muted">{user.email}</div>
            <div className="truncate text-[11px] text-fg-subtle">
              {user.role} · {user.org}
            </div>
          </div>
        </div>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <button type="button" className={itemCls} onClick={() => navigate(routes.settings())}>
            <Settings size={15} className="text-fg-muted" /> Settings
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemCls} onClick={() => navigate(routes.team())}>
            <Users size={15} className="text-fg-muted" /> Team
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemCls} onClick={() => navigate(routes.help())}>
            <CircleHelp size={15} className="text-fg-muted" /> Help & support
          </button>
        </MenuItem>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <button
            type="button"
            className={itemCls}
            onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
          >
            <Ruler size={15} className="text-fg-muted" /> Units
            <span className="ml-auto text-xs text-fg-muted capitalize">{units}</span>
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemCls} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? (
              <Moon size={15} className="text-fg-muted" />
            ) : (
              <Sun size={15} className="text-fg-muted" />
            )}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </MenuItem>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <button type="button" className={itemCls} onClick={logout}>
            <LogOut size={15} className="text-danger" /> <span className="text-danger">Log out</span>
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
