import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import { BOOKING_ENGINES, type BookingsResponse, type BookingStat, type VendorCategory } from '../lib/types'
import { SEQUENTIAL_BLUE, STATUS } from '../lib/chartColors'
import { StatCard } from '../components/StatCard'

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: 'current_month', label: 'Current month' },
  { value: 'last_month', label: 'Last month' },
] as const

type DatePreset = (typeof DATE_PRESETS)[number]['value'] | 'custom'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'captured', label: 'Captured' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending payout' },
  { value: 'settled', label: 'Settled' },
]

function toDateInput(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function presetRange(preset: DatePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date()
  if (preset === 'today') {
    const d = toDateInput(today)
    return { from: d, to: d }
  }
  if (preset === '7d') {
    return { from: toDateInput(new Date(today.getTime() - 6 * 86400000)), to: toDateInput(today) }
  }
  if (preset === '14d') {
    return { from: toDateInput(new Date(today.getTime() - 13 * 86400000)), to: toDateInput(today) }
  }
  if (preset === 'current_month') {
    return { from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), to: toDateInput(today) }
  }
  if (preset === 'last_month') {
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return { from: toDateInput(lastMonthStart), to: toDateInput(lastMonthEnd) }
  }
  return { from: customFrom, to: customTo }
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortDir,
  onToggle,
}: {
  column: string
  label: string
  sortBy: string
  sortDir: 'asc' | 'desc'
  onToggle: (column: string) => void
}) {
  const active = sortBy === column
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}
      >
        {label}
        <span className="text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : '▾'}</span>
      </button>
    </th>
  )
}

function statDelta(stat: BookingStat): { direction: 'up' | 'down' | 'flat'; text: string } | undefined {
  if (stat.delta_pct === null) return undefined
  if (stat.delta_pct === 0) return { direction: 'flat', text: 'vs previous period' }
  return {
    direction: stat.delta_pct > 0 ? 'up' : 'down',
    text: `${Math.abs(stat.delta_pct)}% vs previous period`,
  }
}

export default function BookingsPage() {
  const [data, setData] = useState<BookingsResponse | null>(null)
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [datePreset, setDatePreset] = useState<DatePreset>('7d')
  const [customFrom, setCustomFrom] = useState(() => toDateInput(new Date(Date.now() - 6 * 86400000)))
  const [customTo, setCustomTo] = useState(() => toDateInput(new Date()))

  const [vendor, setVendor] = useState('')
  const [debouncedVendor, setDebouncedVendor] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [pincode, setPincode] = useState('')
  const [debouncedPincode, setDebouncedPincode] = useState('')
  const [status, setStatus] = useState('')
  const [engine, setEngine] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [sortBy, setSortBy] = useState('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVendor(vendor.trim())
      setDebouncedPincode(pincode.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [vendor, pincode])

  useEffect(() => {
    apiRequest<VendorCategory[]>('/crm/v1/vendors/categories')
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]))
  }, [])

  const { from, to } = presetRange(datePreset, customFrom, customTo)

  useEffect(() => {
    setPage(1)
  }, [from, to, debouncedVendor, categoryId, debouncedPincode, status, engine, paymentStatus, sortBy, sortDir, perPage])

  useEffect(() => {
    const controller = new AbortController()

    const params = new URLSearchParams()
    params.set('from', from)
    params.set('to', to)
    if (debouncedVendor) params.set('vendor', debouncedVendor)
    if (categoryId) params.set('category_id', categoryId)
    if (debouncedPincode) params.set('pincode', debouncedPincode)
    if (status) params.set('status', status)
    if (engine) params.set('engine', engine)
    if (paymentStatus) params.set('payment_status', paymentStatus)
    params.set('sort_by', sortBy)
    params.set('sort_dir', sortDir)
    params.set('per_page', String(perPage))
    params.set('page', String(page))

    setLoading(true)
    setError(null)

    apiRequest<BookingsResponse>(`/crm/v1/bookings?${params.toString()}`, { signal: controller.signal })
      .then((res) => setData(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load bookings.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [from, to, debouncedVendor, categoryId, debouncedPincode, status, engine, paymentStatus, sortBy, sortDir, perPage, page])

  const hasFilters = Boolean(vendor || categoryId || pincode || status || engine || paymentStatus)

  function clearFilters() {
    setVendor('')
    setCategoryId('')
    setPincode('')
    setStatus('')
    setEngine('')
    setPaymentStatus('')
  }

  function toggleSort(column: string) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('desc')
    }
  }

  const bookings = data?.bookings

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Bookings</h1>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Date range</label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDatePreset(p.value)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium ${
                    datePreset === p.value ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden self-stretch w-px bg-slate-200 sm:block" />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Custom range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value)
                  setDatePreset('custom')
                }}
                className={inputClass}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value)
                  setDatePreset('custom')
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Search by vendor name or ID…"
              className={inputClass}
            />
          </div>

          <div className="flex min-w-[170px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[130px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Pincode</label>
            <input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="e.g. 302033" className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[160px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Booking status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[190px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Engine</label>
            <select value={engine} onChange={(e) => setEngine(e.target.value)} className={inputClass}>
              <option value="">All engines</option>
              {BOOKING_ENGINES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[170px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Payment / settlement</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass}>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total bookings" value={data.summary.total.value} accent="#2a78d6" delta={statDelta(data.summary.total)} />
          <StatCard label="Completed" value={data.summary.completed.value} accent={STATUS.good} delta={statDelta(data.summary.completed)} />
          <StatCard label="Cancelled" value={data.summary.cancelled.value} accent={STATUS.critical} delta={statDelta(data.summary.cancelled)} />
          <StatCard
            label="Total revenue"
            value={formatCurrency(data.summary.revenue.value)}
            accent={SEQUENTIAL_BLUE[500]}
            delta={statDelta(data.summary.revenue)}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor ID</th>
                <SortableHeader column="vendor_name" label="Vendor" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th className="px-4 py-3 font-medium">Engine</th>
                <SortableHeader column="total" label="Total" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader column="completed" label="Completed" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader column="cancelled" label="Cancelled" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader column="upcoming" label="Upcoming" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader column="avg_booking" label="Avg / booking" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableHeader column="revenue" label="Revenue" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {bookings?.data.map((row, idx) => (
                <tr key={`${row.vendor_id}-${row.engine_name}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">#{row.vendor_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.vendor_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.engine_name}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.total}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {row.completed}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {row.cancelled}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {row.upcoming}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(row.avg_booking)}</td>
                  <td className="px-4 py-3 text-slate-900">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}
          {!loading && bookings?.data.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No bookings match these filters.</p>
          )}
        </div>
      )}

      {bookings && bookings.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Page {bookings.current_page} of {bookings.last_page} · {bookings.total} rows
            </span>
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page</span>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500">
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
              disabled={page >= bookings.last_page}
              onClick={() => setPage((p) => Math.min(bookings.last_page, p + 1))}
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
