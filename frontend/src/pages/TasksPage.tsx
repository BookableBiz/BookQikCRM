import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, ApiError } from '../lib/api'
import { TaskStatusSelect, taskStatusLabel } from '../components/TaskStatusSelect'
import { TASK_STATUSES, type CrmStaffMember, type LeadTask, type Paginated, type TaskStatus } from '../lib/types'

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...TASK_STATUSES]

function staffLabel(staff: CrmStaffMember[], id: number | null) {
  if (!id) return '—'
  const match = staff.find((s) => s.id === id)
  return match ? match.name : `#${id}`
}

function TaskRow({ task, staff, onSaved }: { task: LeadTask; staff: CrmStaffMember[]; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [dueDate, setDueDate] = useState(task.due_date)
  const [assignedTo, setAssignedTo] = useState(String(task.assigned_to ?? ''))
  const [saving, setSaving] = useState(false)

  async function handleStatusChange(status: TaskStatus) {
    setSaving(true)
    try {
      await apiRequest(`/crm/v1/tasks/${task.id}`, { method: 'PUT', body: { status } })
      onSaved()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update task.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await apiRequest(`/crm/v1/tasks/${task.id}`, {
        method: 'PUT',
        body: { due_date: dueDate, assigned_to: Number(assignedTo) },
      })
      setEditing(false)
      onSaved()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update task.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td className="px-4 py-3 text-slate-900">
          <Link to={`/dashboard/leads/${task.vendor_lead_id}`} className="hover:underline">
            {task.lead?.name ?? `#${task.vendor_lead_id}`}
          </Link>
        </td>
        <td className="px-4 py-3 text-slate-600">{task.task_type}</td>
        <td className="px-4 py-3">
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </td>
        <td className="px-4 py-3 text-slate-600">{taskStatusLabel(task.status)}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={handleSaveEdit} className="text-xs font-medium text-slate-900 hover:underline">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs font-medium text-slate-500 hover:text-slate-900">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 text-slate-900">
        <Link to={`/dashboard/leads/${task.vendor_lead_id}`} className="hover:underline">
          {task.lead?.name ?? `#${task.vendor_lead_id}`}
        </Link>
      </td>
      <td className="px-4 py-3 text-slate-600">{task.task_type}</td>
      <td className="px-4 py-3 text-slate-600">{staffLabel(staff, task.assigned_to)}</td>
      <td className="px-4 py-3 text-slate-600">{task.due_date}</td>
      <td className="px-4 py-3 text-slate-600">
        <TaskStatusSelect value={task.status} disabled={saving} onChange={handleStatusChange} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Paginated<LeadTask> | null>(null)
  const [staffOptions, setStaffOptions] = useState<CrmStaffMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [assignedTo, setAssignedTo] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    apiRequest<CrmStaffMember[]>('/crm/v1/staff')
      .then((res) => setStaffOptions(res.data ?? []))
      .catch(() => setStaffOptions([]))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [assignedTo, status])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (assignedTo) params.set('assigned_to', assignedTo)
    if (status) params.set('status', status)
    params.set('page', String(page))

    setLoading(true)
    setError(null)

    apiRequest<Paginated<LeadTask>>(`/crm/v1/tasks?${params.toString()}`, { signal: controller.signal })
      .then((res) => setTasks(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load tasks.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [assignedTo, status, page, refreshKey])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Assigned to</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass}>
            <option value="">Everyone</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tasks?.data.map((task) => (
                <TaskRow key={task.id} task={task} staff={staffOptions} onSaved={() => setRefreshKey((k) => k + 1)} />
              ))}
            </tbody>
          </table>

          {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}
          {!loading && tasks?.data.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No tasks match these filters.</p>}
        </div>
      )}

      {tasks && tasks.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {tasks.current_page} of {tasks.last_page} · {tasks.total} tasks
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= tasks.last_page}
              onClick={() => setPage((p) => Math.min(tasks.last_page, p + 1))}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
