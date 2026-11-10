import {createBrowserRouter} from 'react-router-dom';
import {LoginPage} from '@/features/auth/LoginPage';
import {BlockPage} from '@/features/blocks/BlockPage';
import {DashboardPage} from '@/features/dashboard/DashboardPage';
import {HomeMapPage} from '@/features/map/HomeMapPage';
import {ProjectPage} from '@/features/projects/ProjectPage';
import {ProjectsListPage} from '@/features/projects/ProjectsListPage';
import {NotFoundPage} from '@/features/shell/NotFoundPage';
import {DevicesPage, HelpPage, ReportsPage, SettingsPage, TeamPage} from '@/features/shell/stubs';
import {Layout} from './Layout';

export const router = createBrowserRouter([
  {path: '/login', element: <LoginPage />},
  {
    element: <Layout />,
    children: [
      {index: true, element: <HomeMapPage />},
      {path: 'projects', element: <ProjectsListPage />},
      {path: 'projects/:projectId', element: <ProjectPage />},
      {path: 'projects/:projectId/blocks/:blockId', element: <BlockPage />},
      {
        path: 'projects/:projectId/blocks/:blockId/plots/:plotId',
        // three.js is heavy — load the viewer only when a plot is opened.
        lazy: () => import('@/features/viewer/PlotViewerPage').then((m) => ({Component: m.PlotViewerPage})),
      },
      {path: 'dashboard', element: <DashboardPage />},
      {path: 'reports', element: <ReportsPage />},
      {path: 'devices', element: <DevicesPage />},
      {path: 'team', element: <TeamPage />},
      {path: 'settings', element: <SettingsPage />},
      {path: 'help', element: <HelpPage />},
      {path: '*', element: <NotFoundPage />},
    ],
  },
]);
