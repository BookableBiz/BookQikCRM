import { useEffect, useMemo, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import type { Paginated, Vendor, VendorCategory, VendorSummary } from '../lib/types'
import { SEQUENTIAL_BLUE, STATUS, colorForCategory } from '../lib/chartColors'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function StatCard({
  label,
  value,
  accent,
  delta,
}: {
  label: string
  value: number | string
  accent: string
  delta?: { direction: 'up' | 'down' | 'flat'; text: string }
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
      <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {delta && (
          <p
            className="mt-0.5 text-xs font-medium"
            style={{ color: delta.direction === 'down' ? STATUS.critical : STATUS.good }}
          >
            {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '–'} {delta.text}
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: number }) {
  const isActive = status === 1
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: isActive ? STATUS.good : '#898781' }}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function CategoryChip({ id, name }: { id: number | null; name: string | null }) {
  if (!name) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorForCategory(id) }} />
      {name}
    </span>
  )
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Paginated<Vendor> | null>(null)
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [summary, setSummary] = useState<VendorSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    apiRequest<VendorCategory[]>('/crm/v1/vendors/categories')
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]))

    apiRequest<VendorSummary>('/crm/v1/vendors/summary')
      .then((res) => setSummary(res.data ?? null))
      .catch(() => setSummary(null))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryId, status, month, sortDir, perPage])

  useEffect(() => {
    const controller = new AbortController()

    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (categoryId) params.set('category_id', categoryId)
    if (status) params.set('status', status)
    if (month) params.set('month', month)
    params.set('sort_dir', sortDir)
    params.set('per_page', String(perPage))
    params.set('page', String(page))

    setLoading(true)
    setError(null)

    apiRequest<Paginated<Vendor>>(`/crm/v1/vendors?${params.toString()}`, { signal: controller.signal })
      .then((res) => setVendors(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load vendors.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedSearch, categoryId, status, month, sortDir, perPage, page])

  const maxMonthCount = useMemo(
    () => Math.max(1, ...(summary?.by_month.map((m) => m.count) ?? [1])),
    [summary],
  )
  const maxCategoryCount = useMemo(
    () => Math.max(1, ...(summary?.by_category.map((c) => c.count) ?? [1])),
    [summary],
  )
  const categoryTotal = useMemo(
    () => (summary?.by_category ?? []).reduce((sum, c) => sum + c.count, 0),
    [summary],
  )

  const monthDelta = useMemo(() => {
    const months = summary?.by_month
    if (!months || months.length < 2) return undefined
    const [current, previous] = months
    if (previous.count === 0) return undefined
    const pct = Math.round(((current.count - previous.count) / previous.count) * 100)
    if (pct === 0) return { direction: 'flat' as const, text: 'same as last month' }
    return {
      direction: (pct > 0 ? 'up' : 'down') as 'up' | 'down',
      text: `${Math.abs(pct)}% vs last month`,
    }
  }, [summary])

  const hasFilters = Boolean(search || categoryId || status || month)

  function clearFilters() {
    setSearch('')
    setCategoryId('')
    setStatus('')
    setMonth('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Vendors</h1>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total vendors" value={summary.total} accent="#2a78d6" />
          <StatCard
            label="Active vendors"
            value={summary.active}
            accent={STATUS.good}
            delta={{
              direction: 'flat',
              text: `${summary.total ? Math.round((summary.active / summary.total) * 100) : 0}% of all vendors`,
            }}
          />
          <StatCard label="New this month" value={summary.this_month} accent="#eda100" delta={monthDelta} />
        </div>
      )}

      {summary && (summary.by_month.length > 0 || summary.by_category.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summary.by_month.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Registrations by month</p>
              <div className="flex h-32 items-end gap-2">
                {[...summary.by_month].reverse().map((m) => {
                  const isSelected = month === m.month
                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setMonth(isSelected ? '' : m.month)}
                      className="group flex flex-1 flex-col items-center gap-1"
                      title={`${formatMonthLabel(m.month)}: ${m.count} vendors`}
                    >
                      <div
                        className="w-full rounded-t-sm transition-colors group-hover:opacity-90"
                        style={{
                          height: `${(m.count / maxMonthCount) * 96 + 4}px`,
                          backgroundColor: isSelected ? SEQUENTIAL_BLUE[500] : SEQUENTIAL_BLUE[200],
                        }}
                      />
                      <span className={`text-[10px] ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                        {formatMonthLabel(m.month)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {summary.by_category.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Vendors by category</p>
              <div className="flex flex-col gap-2.5">
                {summary.by_category.slice(0, 6).map((c) => {
                  const isSelected = categoryId === String(c.category_id)
                  const color = colorForCategory(c.category_id)
                  const pct = categoryTotal ? Math.round((c.count / categoryTotal) * 100) : 0
                  return (
                    <button
                      key={c.category_id}
                      type="button"
                      onClick={() => setCategoryId(isSelected ? '' : String(c.category_id))}
                      className={`flex items-center gap-3 rounded-md px-1.5 py-1 text-left transition-colors ${
                        isSelected ? 'bg-slate-50 ring-1 ring-slate-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="w-24 shrink-0 truncate text-xs text-slate-600">{c.category}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${(c.count / maxCategoryCount) * 100}%`, backgroundColor: color }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-700">{c.count}</span>
                      <span className="w-9 shrink-0 text-right text-[10px] text-slate-400">{pct}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Search by name or ID</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Sneha or 1234"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Registration month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Sort by registration</label>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {vendors?.data.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">#{v.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.business_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <CategoryChip id={v.category_id} name={v.category} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{v.email}</div>
                    {v.phone && <div className="text-xs text-slate-400">{v.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.plan_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(v.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}
          {!loading && vendors?.data.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No vendors match these filters.</p>
          )}
        </div>
      )}

      {vendors && vendors.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Page {vendors.current_page} of {vendors.last_page} · {vendors.total} vendors
            </span>
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
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
              disabled={page >= vendors.last_page}
              onClick={() => setPage((p) => Math.min(vendors.last_page, p + 1))}
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
