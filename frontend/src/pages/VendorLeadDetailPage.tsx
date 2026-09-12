import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest, apiUploadForm, ApiError } from '../lib/api'
import { NotesPanel } from '../components/crm/NotesPanel'
import { VisitLogPanel, type VisitLogFields } from '../components/crm/VisitLogPanel'
import { TasksPanel } from '../components/crm/TasksPanel'
import { LEAD_SOURCES, LEAD_STATUSES, type CrmStaffMember, type Lead, type LeadStatus } from '../lib/types'

export default function VendorLeadDetailPage() {
  const { id } = useParams()
  const [lead, setLead] = useState<Lead | null>(null)
  const [staffOptions, setStaffOptions] = useState<CrmStaffMember[]>([])
  const [error, setError] = useState<string | null>(null)

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

  async function handleAddNote(content: string) {
    await apiRequest(`/crm/v1/leads/${id}/notes`, { method: 'POST', body: { content } })
    reload()
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

  async function handleLogVisit(fields: VisitLogFields) {
    await apiUploadForm(`/crm/v1/leads/${id}/visits`, fields)
    reload()
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
        <NotesPanel notes={lead.notes} onAdd={handleAddNote} />
        <VisitLogPanel visits={lead.visits} onLog={handleLogVisit} />
      </div>

      {id && (
        <TasksPanel
          tasks={lead.tasks}
          staff={staffOptions}
          createFields={{ vendor_lead_id: Number(id) }}
          onChanged={reload}
        />
      )}
    </div>
  )
}
