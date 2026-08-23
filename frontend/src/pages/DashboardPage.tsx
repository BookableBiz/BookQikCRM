import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Lead, LeadTask, Paginated } from '../lib/types'

interface Stats {
  leads: number
  tasks: number
}

export default function DashboardPage() {
  const { staff } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiRequest<Paginated<Lead>>('/crm/v1/leads?per_page=1'),
      apiRequest<Paginated<LeadTask>>('/crm/v1/tasks?per_page=1'),
    ])
      .then(([leadsRes, tasksRes]) => {
        setStats({ leads: leadsRes.data!.total, tasks: tasksRes.data!.total })
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard stats.')
      })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {staff?.name}</h1>
        <p className="text-sm text-slate-500">Here's what's happening in the CRM.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Leads</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats ? stats.leads : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats ? stats.tasks : '—'}</p>
        </div>
      </div>
    </div>
  )
}
