import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import type { Lead, Paginated } from '../lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<Paginated<Lead>>('/crm/v1/leads')
      .then((res) => setLeads(res.data!.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load leads.'))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Leads</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && !leads && <p className="text-sm text-slate-500">Loading…</p>}

      {leads && leads.length === 0 && <p className="text-sm text-slate-500">No leads yet.</p>}

      {leads && leads.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{lead.name}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.role}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.sources}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
