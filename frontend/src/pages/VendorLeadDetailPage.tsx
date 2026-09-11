import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest, apiUploadForm, ApiError } from '../lib/api'
import { TaskStatusSelect } from '../components/TaskStatusSelect'
import { LEAD_SOURCES, LEAD_STATUSES, type CrmStaffMember, type Lead, type LeadStatus, type LeadTask, type TaskStatus } from '../lib/types'

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

function formatDateTime(value: string) {
  return new Date(value.replace(' ', 'T')).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function staffLabel(staffList: CrmStaffMember[], id: number | null) {
  if (!id) return 'Unassigned'
  const match = staffList.find((s) => s.id === id)
  return match ? `${match.name} (${match.role})` : `#${id}`
}

function NewTaskForm({ leadId, staff, onCreated }: { leadId: string; staff: CrmStaffMember[]; onCreated: () => void }) {
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
        body: { vendor_lead_id: Number(leadId), task_type: taskType, due_date: dueDate, assigned_to: Number(assignedTo) },
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

export default function VendorLeadDetailPage() {
  const { id } = useParams()
  const [lead, setLead] = useState<Lead | null>(null)
  const [staffOptions, setStaffOptions] = useState<CrmStaffMember[]>([])
  const [error, setError] = useState<string | null>(null)

  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const [visitNotes, setVisitNotes] = useState('')
  const [visitPhoto, setVisitPhoto] = useState<File | null>(null)
  const [savingVisit, setSavingVisit] = useState(false)

  const [updatingStatus, setUpdatingStatus] = useState(false)

  function reload() {
    apiRequest<Lead>(`/crm/v1/leads/${id}`)
      .then((res) => {
        const data = res.data
        setLead(data ? { ...data, notes: data.notes ?? [], visits: data.visits ?? [] } : null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load lead.'))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    apiRequest<CrmStaffMember[]>('/crm/v1/staff')
      .then((res) => setStaffOptions(res.data ?? []))
      .catch(() => setStaffOptions([]))
  }, [])

  async function handleAddNote(event: FormEvent) {
    event.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await apiRequest(`/crm/v1/leads/${id}/notes`, { method: 'POST', body: { content: noteText } })
      setNoteText('')
      reload()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to add note.')
    } finally {
      setSavingNote(false)
    }
  }

  async function handleStatusChange(status: LeadStatus) {
    setUpdatingStatus(true)
    try {
      await apiRequest(`/crm/v1/leads/${id}`, { method: 'PUT', body: { status } })
      reload()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Geolocation is best-effort: if the browser has no support, permission is
  // denied, or it just times out, the visit is still logged without coordinates
  // (the backend field is nullable), matching how mobile only sends them when available.
  function getCurrentCoords(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        () => resolve(null),
        { timeout: 5000 },
      )
    })
  }

  async function handleLogVisit(event: FormEvent) {
    event.preventDefault()
    setSavingVisit(true)
    try {
      const coords = await getCurrentCoords()
      await apiUploadForm(`/crm/v1/leads/${id}/visits`, {
        notes: visitNotes || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        photo: visitPhoto ?? undefined,
      })
      setVisitNotes('')
      setVisitPhoto(null)
      reload()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to log visit.')
    } finally {
      setSavingVisit(false)
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!lead) return <p className="text-sm text-slate-500">Loading…</p>

  const sourceLabel = LEAD_SOURCES.find((s) => s.value === lead.source)?.label ?? lead.source

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/dashboard/leads" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Vendor Leads
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{lead.name}</h1>
        {lead.business_name && <p className="text-sm text-slate-500">{lead.business_name}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Phone</p>
          <p className="text-sm text-slate-900">{lead.phone}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Email</p>
          <p className="text-sm text-slate-900">{lead.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">City</p>
          <p className="text-sm text-slate-900">{lead.city}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Address</p>
          <p className="text-sm text-slate-900">{lead.address ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Source</p>
          <p className="text-sm text-slate-900">
            {sourceLabel}
            {lead.source_detail && <span className="text-slate-400"> · {lead.source_detail}</span>}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Status</p>
          <select
            value={lead.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="mt-0.5 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <form onSubmit={handleAddNote} className="flex flex-col gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={savingNote}
              className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingNote ? 'Saving…' : 'Add note'}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {lead.notes.length === 0 && <p className="text-sm text-slate-400">No notes yet.</p>}
            {[...lead.notes].reverse().map((note, idx) => (
              <div key={idx} className="rounded-md bg-slate-50 p-3 text-sm">
                <p className="text-slate-700">{note.content}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(note.added_at)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Visit log</h2>
          <form onSubmit={handleLogVisit} className="flex flex-col gap-2">
            <textarea
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Notes from this visit (optional)…"
              rows={2}
              className={inputClass}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setVisitPhoto(e.target.files?.[0] ?? null)}
              className="text-xs text-slate-500"
            />
            <button
              type="submit"
              disabled={savingVisit}
              className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingVisit ? 'Logging…' : 'Log visit now'}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {lead.visits.length === 0 && <p className="text-sm text-slate-400">No visits logged yet.</p>}
            {[...lead.visits].reverse().map((visit, idx) => (
              <div key={idx} className="rounded-md bg-slate-50 p-3 text-sm">
                {visit.notes && <p className="text-slate-700">{visit.notes}</p>}
                {visit.photo_url && (
                  <a href={visit.photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                    <img src={visit.photo_url} alt="Visit" className="h-20 w-20 rounded-md object-cover" />
                  </a>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {formatDateTime(visit.visited_at)}
                  {visit.latitude != null && visit.longitude != null && (
                    <> · {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>

        {id && <NewTaskForm leadId={id} staff={staffOptions} onCreated={reload} />}

        {(!lead.tasks || lead.tasks.length === 0) && <p className="text-sm text-slate-400">No tasks yet.</p>}
        {lead.tasks && lead.tasks.length > 0 && (
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
              {lead.tasks.map((task) => (
                <TaskRow key={task.id} task={task} staff={staffOptions} onSaved={reload} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
