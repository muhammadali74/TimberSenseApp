/** WS-G. Hard-coded demo content for the shell and stub screens. */

export type NotificationKind = 'processing' | 'device' | 'report' | 'team' | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO */
  time: string;
  read: boolean;
  /** Optional in-app link */
  href?: string;
}

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'processing',
    title: 'Plot FR-01 processed',
    body: '29 trees measured · 641 stems/ha · 48.5 m²/ha basal area',
    time: ago(42),
    read: false,
    href: '/projects/kotli-sattian/blocks/ks-b01/plots/fariy_1_test',
  },
  {
    id: 'n2',
    kind: 'device',
    title: 'TS-02 battery low',
    body: 'Backpack TS-02 is at 14%. Charge before the next cruise.',
    time: ago(180),
    read: false,
  },
  {
    id: 'n3',
    kind: 'report',
    title: 'Cruise report ready',
    body: 'KS-B01 Fairy Ridge — stand table and volume summary',
    time: ago(60 * 26),
    read: true,
  },
  {
    id: 'n4',
    kind: 'team',
    title: 'Ayesha joined the workspace',
    body: 'Ayesha Malik accepted your invite as Field Crew.',
    time: ago(60 * 52),
    read: true,
  },
  {
    id: 'n5',
    kind: 'system',
    title: 'Firmware 2.4 available',
    body: 'Improved SLAM drift correction under dense canopy.',
    time: ago(60 * 24 * 4),
    read: true,
  },
];

export type DeviceStatus = 'online' | 'charging' | 'offline' | 'capturing';

export interface Device {
  id: string;
  name: string;
  model: string;
  status: DeviceStatus;
  battery: number;
  storageUsedGb: number;
  storageTotalGb: number;
  firmware: string;
  lastSync: string;
  operator: string;
  location: string;
  hoursCaptured: number;
  plotsCaptured: number;
}

export const DEVICES: Device[] = [
  {
    id: 'TS-01',
    name: 'TS-01',
    model: 'TimberSense Backpack',
    status: 'online',
    battery: 82,
    storageUsedGb: 214,
    storageTotalGb: 1024,
    firmware: '2.3.1',
    lastSync: ago(38),
    operator: 'Field crew A',
    location: 'Kotli Sattian, Punjab',
    hoursCaptured: 46.5,
    plotsCaptured: 118,
  },
  {
    id: 'TS-02',
    name: 'TS-02',
    model: 'TimberSense Backpack',
    status: 'charging',
    battery: 14,
    storageUsedGb: 655,
    storageTotalGb: 1024,
    firmware: '2.3.1',
    lastSync: ago(60 * 5),
    operator: 'Field crew B',
    location: 'Kelowna, BC',
    hoursCaptured: 92.1,
    plotsCaptured: 241,
  },
  {
    id: 'TS-03',
    name: 'TS-03',
    model: 'TimberSense Handheld',
    status: 'offline',
    battery: 0,
    storageUsedGb: 88,
    storageTotalGb: 512,
    firmware: '2.2.0',
    lastSync: ago(60 * 24 * 9),
    operator: 'Unassigned',
    location: 'Depot — Williams Lake, BC',
    hoursCaptured: 12.8,
    plotsCaptured: 33,
  },
];

export const DEVICE_SENSORS = [
  {label: 'Lidar', value: '32-beam spinning, 120 m range'},
  {label: 'IMU', value: '9-axis, 200 Hz'},
  {label: 'Cameras', value: '4 × 4K (front / left / right / back)'},
  {label: 'GNSS', value: 'Dual-band RTK-ready'},
];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Cruise Manager' | 'Forester' | 'Field Crew' | 'Viewer';
  lastActive: string;
  status: 'active' | 'invited';
}

export const TEAM: TeamMember[] = [
  {
    id: 'u1',
    name: 'Demo Forester',
    email: 'demo@farmevo.ai',
    role: 'Cruise Manager',
    lastActive: ago(1),
    status: 'active',
  },
  {
    id: 'u2',
    name: 'Usman Raza',
    email: 'usman.raza@example.com',
    role: 'Owner',
    lastActive: ago(60 * 3),
    status: 'active',
  },
  {
    id: 'u3',
    name: 'Ayesha Malik',
    email: 'ayesha.malik@example.com',
    role: 'Field Crew',
    lastActive: ago(60 * 20),
    status: 'active',
  },
  {
    id: 'u4',
    name: 'Liam Tremblay',
    email: 'liam.t@example.com',
    role: 'Forester',
    lastActive: ago(60 * 24 * 2),
    status: 'active',
  },
  {
    id: 'u5',
    name: 'Hamza Qureshi',
    email: 'hamza.q@example.com',
    role: 'Field Crew',
    lastActive: ago(60 * 24 * 6),
    status: 'active',
  },
  {id: 'u6', name: 'Sophie Nguyen', email: 'sophie.n@example.com', role: 'Viewer', lastActive: '', status: 'invited'},
];

export type ReportType = 'Cruise report' | 'Stand table' | 'Tree list' | 'Carbon summary' | 'Thinning plan';

export interface ReportItem {
  id: string;
  title: string;
  type: ReportType;
  project: string;
  scope: string;
  format: 'PDF' | 'CSV' | 'XLSX';
  sizeKb: number;
  created: string;
  status: 'ready' | 'generating';
}

export const REPORTS: ReportItem[] = [
  {
    id: 'r1',
    title: 'Cruise report — KS-B01 Fairy Ridge',
    type: 'Cruise report',
    project: 'Kotli Sattian Pine Cruise',
    scope: 'Block',
    format: 'PDF',
    sizeKb: 2140,
    created: ago(60 * 26),
    status: 'ready',
  },
  {
    id: 'r2',
    title: 'Tree list — Plot FR-01',
    type: 'Tree list',
    project: 'Kotli Sattian Pine Cruise',
    scope: 'Plot',
    format: 'CSV',
    sizeKb: 21,
    created: ago(60 * 26),
    status: 'ready',
  },
  {
    id: 'r3',
    title: 'Stand table — Kotli Sattian',
    type: 'Stand table',
    project: 'Kotli Sattian Pine Cruise',
    scope: 'Project',
    format: 'XLSX',
    sizeKb: 64,
    created: ago(60 * 30),
    status: 'ready',
  },
  {
    id: 'r4',
    title: 'Carbon summary — Q3 2026',
    type: 'Carbon summary',
    project: 'All projects',
    scope: 'Workspace',
    format: 'PDF',
    sizeKb: 880,
    created: ago(60 * 24 * 12),
    status: 'ready',
  },
  {
    id: 'r5',
    title: 'Thinning plan — KS-B01',
    type: 'Thinning plan',
    project: 'Kotli Sattian Pine Cruise',
    scope: 'Block',
    format: 'PDF',
    sizeKb: 1320,
    created: ago(5),
    status: 'generating',
  },
  {
    id: 'r6',
    title: 'Cruise report — A18667/216/LV4357',
    type: 'Cruise report',
    project: 'Okanagan Highlands Restock Survey',
    scope: 'Block',
    format: 'PDF',
    sizeKb: 1975,
    created: ago(60 * 24 * 21),
    status: 'ready',
  },
];
