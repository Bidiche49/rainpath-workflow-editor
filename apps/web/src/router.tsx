import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/app-layout';
import { DashboardPage } from '@/routes/dashboard-page';
import { WorkflowEditPage } from '@/routes/workflow-edit-page';
import { WorkflowPreviewPage } from '@/routes/workflow-preview-page';
import { WorkflowsPage } from '@/routes/workflows-page';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/workflows', element: <WorkflowsPage /> },
      { path: '/workflows/:id/edit', element: <WorkflowEditPage /> },
      { path: '/workflows/:id/preview', element: <WorkflowPreviewPage /> },
    ],
  },
]);
