/** Route builders — use these instead of hand-writing paths so links stay consistent. */
export const routes = {
  login: () => '/login',
  home: () => '/',
  projects: () => '/projects',
  project: (projectId: string, tab?: 'overview' | 'summary') =>
    `/projects/${projectId}${tab && tab !== 'overview' ? `?tab=${tab}` : ''}`,
  block: (projectId: string, blockId: string, tab?: 'overview' | 'summary') =>
    `/projects/${projectId}/blocks/${blockId}${tab && tab !== 'overview' ? `?tab=${tab}` : ''}`,
  plot: (projectId: string, blockId: string, plotId: string) =>
    `/projects/${projectId}/blocks/${blockId}/plots/${plotId}`,
  dashboard: () => '/dashboard',
  reports: () => '/reports',
  devices: () => '/devices',
  team: () => '/team',
  settings: () => '/settings',
  help: () => '/help',
} as const;
