import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CRM_ROLES, isAdmin, type CrmRole, type CrmStaffMember } from '../lib/types'

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

function NewStaffForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<CrmRole>('sales')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiRequest('/crm/v1/staff', { method: 'POST', body: { name, email, password, role } })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create staff account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Name <span className="text-red-500">*</span>
          </span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Email <span className="text-red-500">*</span>
          </span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Password <span className="text-red-500">*</span>
          </span>
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Role <span className="text-red-500">*</span>
          </span>
          <select value={role} onChange={(e) => setRole(e.target.value as CrmRole)} className={inputClass}>
            {CRM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create account'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Cancel
        </button>
      </div>
    </form>
  )
}

function EditStaffRow({ member, onSaved, onCancel }: { member: CrmStaffMember; onSaved: () => void; onCancel: () => void }) {
  const [role, setRole] = useState<CrmRole>((member.role as CrmRole) ?? 'sales')
  const [status, setStatus] = useState(member.status ?? 1)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await apiRequest(`/crm/v1/staff/${member.id}`, {
        method: 'PUT',
        body: { role, status, password: password || undefined },
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update staff account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b border-slate-100 bg-slate-50">
      <td className="px-4 py-3 text-slate-900">{member.name}</td>
      <td className="px-4 py-3 text-slate-600">{member.email}</td>
      <td className="px-4 py-3">
        <select value={role} onChange={(e) => setRole(e.target.value as CrmRole)} className={inputClass}>
          {CRM_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className={inputClass}>
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="password"
          placeholder="New password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function StaffPage() {
  const { staff } = useAuth()
  const [members, setMembers] = useState<CrmStaffMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    apiRequest<CrmStaffMember[]>('/crm/v1/staff')
      .then((res) => setMembers(res.data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load staff.'))
  }, [refreshKey])

  if (!isAdmin(staff)) {
    return <p className="text-sm text-slate-500">Only admins can manage CRM staff accounts.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">CRM Staff</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Close' : 'New Staff'}
        </button>
      </div>

      {showForm && (
        <NewStaffForm
          onCreated={() => {
            setShowForm(false)
            setRefreshKey((k) => k + 1)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {members?.map((m) =>
                editingId === m.id ? (
                  <EditStaffRow
                    key={m.id}
                    member={m}
                    onSaved={() => {
                      setEditingId(null)
                      setRefreshKey((k) => k + 1)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{m.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          m.status === 0 ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {m.status === 0 ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingId(m.id)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          {members?.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">No CRM staff yet.</p>}
        </div>
      )}
    </div>
  )
}
