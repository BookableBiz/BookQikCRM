import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest, apiDownload, apiUpload, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  canManageLeads,
  type CrmStaffMember,
  type Lead,
  type LeadImportResult,
  type LeadSource,
  type Paginated,
  type VendorCategory,
} from '../lib/types'

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...LEAD_STATUSES]

const sourceLabel = (source: LeadSource) => LEAD_SOURCES.find((s) => s.value === source)?.label ?? source

function StatusBadge({ status }: { status: Lead['status'] }) {
  const styles: Record<Lead['status'], string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    qualified: 'bg-violet-100 text-violet-700',
    converted: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

const CITY_OPTIONS = ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Delhi', 'Mumbai']

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">
        {label} {required ? <span className="text-red-500">*</span> : <span className="text-slate-400">(optional)</span>}
      </span>
      {children}
    </label>
  )
}

function NewLeadForm({
  categories,
  staff,
  onCreated,
  onCancel,
}: {
  categories: VendorCategory[]
  staff: CrmStaffMember[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    business_name: '',
    city: 'Jaipur',
    address: '',
    category_id: '',
    source: 'direct_visit' as LeadSource,
    source_detail: '',
    assigned_to: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/crm/v1/leads', {
        method: 'POST',
        body: {
          ...form,
          category_id: form.category_id || null,
          assigned_to: form.assigned_to || null,
          email: form.email || null,
        },
      })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create lead.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" required>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone" required>
          <input required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Business name">
          <input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} className={inputClass} />
        </Field>
        <Field label="City" required>
          <input
            required
            list="city-options"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="Pick a city or type your own"
            className={inputClass}
          />
          <datalist id="city-options">
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
        </Field>

        <Field label="Category">
          <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputClass}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source" required>
          <select value={form.source} onChange={(e) => set('source', e.target.value as LeadSource)} className={inputClass}>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source detail">
          <input
            placeholder="Tool name, etc."
            value={form.source_detail}
            onChange={(e) => set('source_detail', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Assign to">
          <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save lead'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Cancel
        </button>
      </div>
    </form>
  )
}

function ImportPanel({ onImported, onCancel }: { onImported: () => void; onCancel: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<LeadImportResult | null>(null)

  async function handleDownloadTemplate() {
    try {
      await apiDownload('/crm/v1/leads/import-template', 'vendor-leads-template.csv')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to download template.')
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const res = await apiUpload<LeadImportResult>('/crm/v1/leads/import', file)
      setResult(res.data ?? null)
      onImported()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to import file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">
        Download the CSV template, fill in your leads, then upload it here to bulk-create them.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Download template (.csv)
        </button>

        <label className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload CSV'}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>

        <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Close
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <p className="font-medium text-emerald-700">{result.imported} lead(s) imported.</p>
          {result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-amber-700">Skipped ({result.skipped.length}):</p>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {result.skipped.map((s, idx) => (
                  <li key={idx}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-700">Errors ({result.errors.length}):</p>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {result.errors.map((e, idx) => (
                  <li key={idx}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  const { staff } = useAuth()
  const [leads, setLeads] = useState<Paginated<Lead> | null>(null)
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [staffOptions, setStaffOptions] = useState<CrmStaffMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    apiRequest<VendorCategory[]>('/crm/v1/vendors/categories')
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]))

    apiRequest<CrmStaffMember[]>('/crm/v1/staff')
      .then((res) => setStaffOptions(res.data ?? []))
      .catch(() => setStaffOptions([]))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, city, source, status])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (city) params.set('city', city)
    if (source) params.set('source', source)
    if (status) params.set('status', status)
    params.set('page', String(page))

    setLoading(true)
    setError(null)

    apiRequest<Paginated<Lead>>(`/crm/v1/leads?${params.toString()}`, { signal: controller.signal })
      .then((res) => setLeads(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load leads.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [search, city, source, status, page, refreshKey])

  async function handleDelete(id: number) {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    try {
      await apiRequest(`/crm/v1/leads/${id}`, { method: 'DELETE' })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete lead.')
    }
  }

  async function handleAssign(id: number, assignedTo: string) {
    setAssigningId(id)
    try {
      await apiRequest(`/crm/v1/leads/${id}`, {
        method: 'PUT',
        body: { assigned_to: assignedTo ? Number(assignedTo) : null },
      })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to assign lead.')
    } finally {
      setAssigningId(null)
    }
  }

  function staffName(id: number | null) {
    if (!id) return '—'
    return staffOptions.find((s) => s.id === id)?.name ?? `#${id}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Vendor Leads</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowImport((v) => !v)
              setShowForm(false)
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showImport ? 'Close' : 'Import CSV'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v)
              setShowImport(false)
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? 'Close' : 'New Lead'}
          </button>
        </div>
      </div>

      {showImport && (
        <ImportPanel
          onImported={() => setRefreshKey((k) => k + 1)}
          onCancel={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <NewLeadForm
          categories={categories}
          staff={staffOptions}
          onCreated={() => {
            setShowForm(false)
            setRefreshKey((k) => k + 1)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email…" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any city" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {leads?.data.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link to={`/dashboard/leads/${lead.id}`} className="hover:underline">
                      {lead.name}
                    </Link>
                    {lead.business_name && <div className="text-xs text-slate-400">{lead.business_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.city}</td>
                  <td className="px-4 py-3 text-slate-600">{sourceLabel(lead.source)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {canManageLeads(staff) ? (
                      <select
                        value={lead.assigned_to ?? ''}
                        disabled={assigningId === lead.id}
                        onChange={(e) => handleAssign(lead.id, e.target.value)}
                        className={`${inputClass} disabled:opacity-50`}
                      >
                        <option value="">Unassigned</option>
                        {staffOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      staffName(lead.assigned_to)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageLeads(staff) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}
          {!loading && leads?.data.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No vendor leads match these filters.</p>
          )}
        </div>
      )}

      {leads && leads.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {leads.current_page} of {leads.last_page} · {leads.total} leads
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
              disabled={page >= leads.last_page}
              onClick={() => setPage((p) => Math.min(leads.last_page, p + 1))}
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
