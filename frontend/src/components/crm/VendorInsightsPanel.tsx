import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import type { VendorInsights } from '../../lib/types'
import { SEQUENTIAL_BLUE, STATUS } from '../../lib/chartColors'
import { StatCard } from '../StatCard'
import { formatDateTime, inputClass } from './shared'

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(value: string) {
  // value is a date-only string (YYYY-MM-DD, possibly with a time suffix);
  // parse the date part as local time, not UTC midnight, so timezones behind
  // UTC don't display the previous day.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function VendorInsightsPanel({ vendorId }: { vendorId: number }) {
  const [insights, setInsights] = useState<VendorInsights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 90 * 86400000)))
  const [to, setTo] = useState(() => toDateInput(new Date()))

  function load(fromDate: string, toDate: string) {
    setLoading(true)
    setError(null)
    apiRequest<VendorInsights>(`/crm/v1/vendors/${vendorId}/insights?from=${fromDate}&to=${toDate}`)
      .then((res) => {
        const data = res.data
        if (!data) return
        setInsights({
          ...data,
          locations: data.locations ?? [],
          services: data.services ?? [],
          booking_summary: data.booking_summary ?? [],
          revenue: { ...data.revenue, recent: data.revenue?.recent ?? [] },
        })
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load vendor insights.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  function applyPreset(days: number) {
    const newFrom = toDateInput(new Date(Date.now() - days * 86400000))
    const newTo = toDateInput(new Date())
    setFrom(newFrom)
    setTo(newTo)
    load(newFrom, newTo)
  }

  function applyCustomRange() {
    load(from, to)
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (loading && !insights) return <p className="text-sm text-slate-500">Loading insights…</p>
  if (!insights) return null

  const maxWeekCount = Math.max(1, ...insights.booking_summary.map((w) => w.total))
  const activeWeek = insights.booking_summary.find((w) => w.week_start === selectedWeek)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Category &amp; locations</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Category</p>
              <p className="text-sm text-slate-900">{insights.category ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Subcategory</p>
              <p className="text-sm text-slate-900">{insights.sub_category ?? '—'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {insights.locations.length === 0 && <p className="text-sm text-slate-400">No locations on file.</p>}
            {insights.locations.map((loc, idx) => (
              <div key={idx} className="rounded-md bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{loc.name}</p>
                <p className="mt-0.5 text-slate-600">
                  {[loc.address, loc.city, loc.postal_code].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Services</h2>
          <div className="flex flex-col gap-2">
            {insights.services.length === 0 && <p className="text-sm text-slate-400">No services listed yet.</p>}
            {insights.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{service.title}</p>
                  <p className="text-xs text-slate-500">{service.category ?? '—'}</p>
                </div>
                {service.price != null && (
                  <p className="text-sm font-medium text-slate-700">{formatCurrency(Number(service.price))}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-slate-900">Bookings — last 8 weeks</p>
        <div className="flex h-32 items-end gap-2">
          {insights.booking_summary.map((week) => {
            const isSelected = selectedWeek === week.week_start
            return (
              <button
                key={week.week_start}
                type="button"
                onClick={() => setSelectedWeek(isSelected ? null : week.week_start)}
                className="group flex flex-1 flex-col items-center gap-1"
                title={`Week of ${formatWeekLabel(week.week_start)}: ${week.total} bookings`}
              >
                <div
                  className="w-full rounded-t-sm transition-colors group-hover:opacity-90"
                  style={{
                    height: `${(week.total / maxWeekCount) * 96 + 4}px`,
                    backgroundColor: isSelected ? SEQUENTIAL_BLUE[500] : SEQUENTIAL_BLUE[200],
                  }}
                />
                <span className={`text-[10px] ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                  {formatWeekLabel(week.week_start)}
                </span>
              </button>
            )
          })}
        </div>
        {activeWeek && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <span>Completed: <span className="font-medium text-slate-900">{activeWeek.completed}</span></span>
            <span>Cancelled: <span className="font-medium text-slate-900">{activeWeek.cancelled}</span></span>
            <span>Upcoming: <span className="font-medium text-slate-900">{activeWeek.upcoming}</span></span>
            <span>In progress: <span className="font-medium text-slate-900">{activeWeek.inprogress}</span></span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Revenue</h2>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            <button
              type="button"
              onClick={applyCustomRange}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Collected" value={formatCurrency(insights.revenue.total_collected)} accent={STATUS.good} />
          <StatCard label="Net payout" value={formatCurrency(insights.revenue.total_net)} accent={SEQUENTIAL_BLUE[500]} />
          <StatCard
            label="Failed transactions"
            value={insights.revenue.failed_count}
            accent={insights.revenue.failed_count > 0 ? STATUS.warning : STATUS.good}
          />
        </div>

        <div className="flex flex-col gap-2">
          {insights.revenue.recent.length === 0 && (
            <p className="text-sm text-slate-400">No transactions in this date range.</p>
          )}
          {insights.revenue.recent.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Service</th>
                  <th className="py-2 font-medium">Gross</th>
                  <th className="py-2 font-medium">Net</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {insights.revenue.recent.map((txn) => (
                  <tr key={txn.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-600">{formatDateTime(txn.date)}</td>
                    <td className="py-2 text-slate-900">{txn.service_name}</td>
                    <td className="py-2 text-slate-600">{formatCurrency(txn.gross_amount)}</td>
                    <td className="py-2 text-slate-600">{formatCurrency(txn.net_amount)}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          txn.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
