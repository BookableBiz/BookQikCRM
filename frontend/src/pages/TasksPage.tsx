import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import type { LeadTask, Paginated } from '../lib/types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<LeadTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<Paginated<LeadTask>>('/crm/v1/tasks')
      .then((res) => setTasks(res.data!.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load tasks.'))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && !tasks && <p className="text-sm text-slate-500">Loading…</p>}

      {tasks && tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}

      {tasks && tasks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{task.leadname}</td>
                  <td className="px-4 py-3 text-slate-600">{task.tasktype}</td>
                  <td className="px-4 py-3 text-slate-600">{task.assign}</td>
                  <td className="px-4 py-3 text-slate-600">{task.duedate}</td>
                  <td className="px-4 py-3 text-slate-600">{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
