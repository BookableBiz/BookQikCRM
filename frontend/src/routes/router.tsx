import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import LeadsPage from '../pages/LeadsPage'
import VendorLeadDetailPage from '../pages/VendorLeadDetailPage'
import TasksPage from '../pages/TasksPage'
import StaffPage from '../pages/StaffPage'
import VendorsPage from '../pages/VendorsPage'
import VendorDetailPage from '../pages/VendorDetailPage'
import AssetsCampaignPage from '../pages/AssetsCampaignPage'
import BookingsPage from '../pages/BookingsPage'
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
      { path: 'leads/:id', element: <VendorLeadDetailPage /> },
      { path: 'vendors', element: <VendorsPage /> },
      { path: 'vendors/:id', element: <VendorDetailPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'assets-campaign', element: <AssetsCampaignPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'staff', element: <StaffPage /> },
    ],
  },
])

export default router
