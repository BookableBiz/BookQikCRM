import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import LeadsPage from '../pages/LeadsPage'
import TasksPage from '../pages/TasksPage'
import NotesPage from '../pages/NotesPage'
import VendorsPage from '../pages/VendorsPage'
import DashboardLayout from '../components/layout/DashboardLayout'
import { ProtectedRoute } from '../lib/auth'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'leads', element: <LeadsPage /> },
      { path: 'vendors', element: <VendorsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'notes', element: <NotesPage /> },
    ],
  },
])

export default router
