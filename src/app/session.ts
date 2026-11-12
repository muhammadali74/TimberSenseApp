/**
 * Fake client-side auth for the demo (no backend). Session lives in sessionStorage.
 * WS-G owns the login UI; this module is shared (contract) — keep the API stable.
 */
import {create} from 'zustand';

const PASSWORD = 'timbersense';

/** Accounts allowed to sign in (no backend; all share the demo password). */
export const ACCOUNTS: {email: string; name: string; role: string}[] = [
  {email: 'rana@farmevo.ai', name: 'Rana', role: 'Cruise Manager'},
  {email: 'ali_naqvi@farmevo.ai', name: 'Ali Naqvi', role: 'Cruise Manager'},
  {email: 'zaryan_siddiqui@farmevo.ai', name: 'Zaryan Siddiqui', role: 'Cruise Manager'},
];

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export interface SessionUser {
  email: string;
  name: string;
  initials: string;
  org: string;
  role: string;
}

const KEY = 'timbersense.session';

function readStored(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

interface SessionState {
  user: SessionUser | null;
  /** Resolves true on success. Only the ACCOUNTS emails with the shared password are accepted. */
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  user: readStored(),
  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 450)); // feel like a real request
    const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
    if (!account || password !== PASSWORD) return false;
    const user: SessionUser = {
      email: account.email,
      name: account.name,
      initials: initialsOf(account.name),
      org: 'Farmevo Technologies',
      role: account.role,
    };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(user));
    } catch {
      /* private mode — session only lives in memory */
    }
    set({user});
    return true;
  },
  logout: () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({user: null});
  },
}));
