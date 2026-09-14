import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest, apiUploadForm, ApiError } from '../lib/api'
import { NotesPanel } from '../components/crm/NotesPanel'
import { VisitLogPanel, type VisitLogFields } from '../components/crm/VisitLogPanel'
import { TasksPanel } from '../components/crm/TasksPanel'
import { VendorInsightsPanel } from '../components/crm/VendorInsightsPanel'
import type { CrmStaffMember, Vendor } from '../lib/types'

export default function VendorDetailPage() {
  const { id } = useParams()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [staffOptions, setStaffOptions] = useState<CrmStaffMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'insights'>('overview')
  const [insightsOpened, setInsightsOpened] = useState(false)
  const latestRequestId = useRef(id)

  function reload() {
    const requestId = id
    latestRequestId.current = requestId
    setError(null)
    apiRequest<Vendor>(`/crm/v1/vendors/${id}`)
      .then((res) => {
        if (latestRequestId.current !== requestId) return // a newer vendor id was requested since
        const data = res.data
        setVendor(data ? { ...data, notes: data.notes ?? [], visits: data.visits ?? [] } : null)
      })
      .catch((err) => {
        if (latestRequestId.current !== requestId) return
        setError(err instanceof ApiError ? err.message : 'Failed to load vendor.')
      })
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
    await apiRequest(`/crm/v1/vendors/${id}/notes`, { method: 'POST', body: { content } })
    reload()
  }

  async function handleLogVisit(fields: VisitLogFields) {
    await apiUploadForm(`/crm/v1/vendors/${id}/visits`, fields)
    reload()
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!vendor) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/dashboard/vendors" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Vendors
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{vendor.name}</h1>
        {vendor.business_name && <p className="text-sm text-slate-500">{vendor.business_name}</p>}
      </div>

      <div className="flex gap-2">
        {(['overview', 'insights'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              if (t === 'insights') setInsightsOpened(true)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t === 'overview' ? 'Overview' : 'Business Insights'}
          </button>
        ))}
      </div>

      <div className={tab === 'overview' ? 'flex flex-col gap-6' : 'hidden'}>
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Phone</p>
            <p className="text-sm text-slate-900">{vendor.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Email</p>
            <p className="text-sm text-slate-900">{vendor.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Category</p>
            <p className="text-sm text-slate-900">{vendor.category ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Plan</p>
            <p className="text-sm text-slate-900">{vendor.plan_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Status</p>
            <p className="mt-0.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  vendor.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {vendor.status === 1 ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NotesPanel notes={vendor.notes ?? []} onAdd={handleAddNote} />
          <VisitLogPanel visits={vendor.visits ?? []} onLog={handleLogVisit} />
        </div>

        {id && (
          <TasksPanel
            tasks={vendor.tasks}
            staff={staffOptions}
            createFields={{ vendor_id: Number(id) }}
            onChanged={reload}
          />
        )}
      </div>

      {insightsOpened && id && (
        <div className={tab === 'insights' ? '' : 'hidden'}>
          <VendorInsightsPanel vendorId={Number(id)} />
        </div>
      )}
    </div>
  )
}
