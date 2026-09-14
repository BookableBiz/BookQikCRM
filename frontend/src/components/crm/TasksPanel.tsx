import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { TaskStatusSelect } from '../TaskStatusSelect'
import type { CrmStaffMember, LeadTask, TaskStatus } from '../../lib/types'
import { inputClass, staffLabel } from './shared'

function NewTaskForm({
  createFields,
  staff,
  onCreated,
}: {
  createFields: { vendor_lead_id: number } | { vendor_id: number }
  staff: CrmStaffMember[]
  onCreated: () => void
}) {
  const [taskType, setTaskType] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await apiRequest('/crm/v1/tasks', {
        method: 'POST',
        body: { ...createFields, task_type: taskType, due_date: dueDate, assigned_to: Number(assignedTo) },
      })
      setTaskType('')
      setDueDate('')
      setAssignedTo('')
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <input required placeholder="Task (e.g. Follow-up call)" value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inputClass} />
      <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
      <select required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass}>
        <option value="">Assign to…</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.role})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add task'}
      </button>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </form>
  )
}

function TaskRow({ task, staff, onSaved }: { task: LeadTask; staff: CrmStaffMember[]; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [taskType, setTaskType] = useState(task.task_type)
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
        body: { task_type: taskType, due_date: dueDate, assigned_to: Number(assignedTo) },
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
        <td className="py-2 pr-2">
          <input value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inputClass} />
        </td>
        <td className="py-2 pr-2">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </td>
        <td className="py-2 pr-2" colSpan={2}>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 text-right">
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
      <td className="py-2 text-slate-900">{task.task_type}</td>
      <td className="py-2 text-slate-600">{task.due_date}</td>
      <td className="py-2 text-slate-600">{staffLabel(staff, task.assigned_to)}</td>
      <td className="py-2 text-slate-600">
        <TaskStatusSelect value={task.status} disabled={saving} onChange={handleStatusChange} />
      </td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}

export function TasksPanel({
  tasks,
  staff,
  createFields,
  onChanged,
}: {
  tasks: LeadTask[] | undefined
  staff: CrmStaffMember[]
  createFields: { vendor_lead_id: number } | { vendor_id: number }
  onChanged: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>

      <NewTaskForm createFields={createFields} staff={staff} onCreated={onChanged} />

      {(!tasks || tasks.length === 0) && <p className="text-sm text-slate-400">No tasks yet.</p>}
      {tasks && tasks.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Due</th>
              <th className="py-2 font-medium">Assigned</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} staff={staff} onSaved={onChanged} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
