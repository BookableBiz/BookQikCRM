import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/leads', label: 'Leads', end: false },
  { to: '/dashboard/vendors', label: 'Vendors', end: false },
  { to: '/dashboard/tasks', label: 'Tasks', end: false },
  { to: '/dashboard/notes', label: 'Notes', end: false },
]

export default function DashboardLayout() {
  const { staff, logout } = useAuth()

  return (
    <div className="flex min-h-svh bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5 text-lg font-bold text-slate-900">BookableCRM</div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-sm font-medium text-slate-900">{staff?.name}</p>
          <p className="text-xs text-slate-500">{staff?.role}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
