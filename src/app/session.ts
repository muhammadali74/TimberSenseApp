/**
 * Fake client-side auth for the demo (no backend). Session lives in sessionStorage.
 * WS-G owns the login UI; this module is shared (contract) — keep the API stable.
 */
import {create} from 'zustand';

export const DEMO_CREDENTIALS = {email: 'demo@farmevo.ai', password: 'timbersense'} as const;

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
  /** Resolves true on success. Only the demo credentials are accepted. */
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  user: readStored(),
  login: async (email, password) => {
    await new Promise((r) => setTimeout(r, 450)); // feel like a real request
    const ok = email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;
    if (!ok) return false;
    const user: SessionUser = {
      email: DEMO_CREDENTIALS.email,
      name: 'Demo Forester',
      initials: 'DF',
      org: 'Farmevo Technologies',
      role: 'Cruise Manager',
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
