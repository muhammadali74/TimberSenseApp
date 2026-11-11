/**
 * WS-G. App-shell UI state. Other workstreams may READ `region` (e.g. WS-H filters/flies the map)
 * and `units`; only the shell writes them.
 */
import {create} from 'zustand';
import {setUnits as applyUnits, type Units} from '@/lib/format';
import {type AppNotification, MOCK_NOTIFICATIONS} from './mockData';

export type RegionId = 'all' | 'punjab' | 'bc';
export type Theme = 'light' | 'dark';

export const REGIONS: {id: RegionId; label: string; hint: string}[] = [
  {id: 'all', label: 'All regions', hint: 'Every project'},
  {id: 'punjab', label: 'Punjab, Pakistan', hint: 'Murree Hills · Kotli Sattian'},
  {id: 'bc', label: 'British Columbia', hint: 'Southern Interior · Cariboo · Kootenay'},
];

const read = <T extends string>(key: string, fallback: T, allowed: readonly T[]): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage unavailable */
  }
};

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

interface ShellState {
  region: RegionId;
  units: Units;
  theme: Theme;
  notifications: AppNotification[];
  notificationsOpen: boolean;
  uploadOpen: boolean;
  shareOpen: boolean;
  setRegion: (r: RegionId) => void;
  setUnits: (u: Units) => void;
  setTheme: (t: Theme) => void;
  setNotificationsOpen: (o: boolean) => void;
  setUploadOpen: (o: boolean) => void;
  setShareOpen: (o: boolean) => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'read' | 'time'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const initialUnits = read<Units>('ts.units', 'metric', ['metric', 'imperial']);
const initialTheme = read<Theme>('ts.theme', 'light', ['light', 'dark']);
applyUnits(initialUnits);
applyTheme(initialTheme);

export const useShell = create<ShellState>()((set) => ({
  region: read<RegionId>('ts.region', 'all', ['all', 'punjab', 'bc']),
  units: initialUnits,
  theme: initialTheme,
  notifications: MOCK_NOTIFICATIONS,
  notificationsOpen: false,
  uploadOpen: false,
  shareOpen: false,
  setRegion: (region) => {
    write('ts.region', region);
    set({region});
  },
  setUnits: (units) => {
    applyUnits(units);
    write('ts.units', units);
    set({units});
  },
  setTheme: (theme) => {
    applyTheme(theme);
    write('ts.theme', theme);
    set({theme});
  },
  setNotificationsOpen: (notificationsOpen) => set({notificationsOpen}),
  setUploadOpen: (uploadOpen) => set({uploadOpen}),
  setShareOpen: (shareOpen) => set({shareOpen}),
  pushNotification: (n) =>
    set((s) => ({
      notifications: [{...n, id: `n${Date.now()}`, read: false, time: new Date().toISOString()}, ...s.notifications],
    })),
  markAllRead: () => set((s) => ({notifications: s.notifications.map((n) => ({...n, read: true}))})),
  markRead: (id) => set((s) => ({notifications: s.notifications.map((n) => (n.id === id ? {...n, read: true} : n))})),
}));
