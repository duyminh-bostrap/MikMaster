import { createHashRouter } from 'react-router'
import DashboardPage from '@/pages/DashboardPage'
import DetailPage from '@/pages/DetailPage'
import StartPage from '@/pages/StartPage'
import { ProjectGuard } from './ProjectGuard'

// Hash routing để chạy được cả khi đóng gói desktop (file://) mà không cần server rewrite.
export const router = createHashRouter([
  { path: '/', element: <StartPage /> },
  {
    path: '/project',
    element: <ProjectGuard />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projectors/:projectorId', element: <DetailPage /> },
    ],
  },
  { path: '*', element: <StartPage /> },
])
