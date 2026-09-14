import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import type { AppReviewsResponse } from '../lib/types'
import { STATUS } from '../lib/chartColors'
import { StatCard } from '../components/StatCard'
import { inputClass, formatDateTime } from '../components/crm/shared'

const RATING_OPTIONS = [
  { value: '', label: 'All ratings' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
]

function stars(rating: number | null) {
  if (rating === null) return '—'
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function vitalsColor(rate: number | null): string {
  if (rate === null) return STATUS.good
  if (rate >= 0.02) return STATUS.critical
  if (rate >= 0.01) return STATUS.warning
  return STATUS.good
}

function formatPct(rate: number | null) {
  return rate === null ? 'No data' : `${(rate * 100).toFixed(2)}%`
}

export default function AppReviewsPage() {
  const [data, setData] = useState<AppReviewsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [rating, setRating] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20

  useEffect(() => {
    setPage(1)
  }, [rating, from, to])

  useEffect(() => {
    const controller = new AbortController()

    const params = new URLSearchParams()
    params.set('platform', 'android')
    if (rating) params.set('rating', rating)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('per_page', String(perPage))
    params.set('page', String(page))

    setLoading(true)
    setError(null)

    apiRequest<AppReviewsResponse>(`/crm/v1/app-reviews?${params.toString()}`, { signal: controller.signal })
      .then((res) => setData(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load reviews.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [rating, from, to, page])

  const reviews = data?.reviews
  const vitals = data?.latest_vitals

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">App Reviews</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Reviews" value={data?.summary.total ?? 0} accent="#2a78d6" />
        <StatCard
          label="Average Rating"
          value={data?.summary.avg_rating !== null && data?.summary.avg_rating !== undefined ? data.summary.avg_rating.toFixed(2) : '—'}
          accent="#eda100"
        />
        <StatCard label="Crash Rate" value={formatPct(vitals?.crash_rate ?? null)} accent={vitalsColor(vitals?.crash_rate ?? null)} />
        <StatCard label="ANR Rate" value={formatPct(vitals?.anr_rate ?? null)} accent={vitalsColor(vitals?.anr_rate ?? null)} />
      </div>
      {vitals && (
        <p className="-mt-4 text-xs text-slate-400">
          Crash/ANR rates as of {vitals.metric_date} — Play Store only reports these once daily active usage crosses its
          minimum threshold, so "No data" means too few sessions, not a sync failure.
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={inputClass}>
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
          {(rating || from || to) && (
            <button
              type="button"
              onClick={() => {
                setRating('')
                setFrom('')
                setTo('')
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">App Version</th>
              <th className="px-4 py-3">Reviewed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && reviews?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No reviews found for the selected filters. Play Store's API only exposes a recent rolling window, so
                  older reviews outside that window won't appear here even after syncing.
                </td>
              </tr>
            )}
            {reviews?.data.map((review) => (
              <tr key={review.id}>
                <td className="px-4 py-3 whitespace-nowrap text-amber-500">{stars(review.rating)}</td>
                <td className="px-4 py-3 max-w-md text-slate-700">{review.body || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{review.author_name || 'Anonymous'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{review.app_version || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {review.reviewed_at ? formatDateTime(review.reviewed_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviews && reviews.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {reviews.current_page} of {reviews.last_page} ({reviews.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= reviews.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
