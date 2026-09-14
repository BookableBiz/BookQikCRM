import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StatCard } from '../components/StatCard'
import { SEQUENTIAL_BLUE, STATUS, CATEGORY_PALETTE, NEUTRAL } from '../lib/chartColors'
import { LEAD_STATUSES, TASK_STATUSES, LEAD_SOURCES, type DashboardSummary } from '../lib/types'

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: '#2a78d6',
  contacted: '#eda100',
  qualified: '#4a3aa7',
  converted: STATUS.good,
  lost: NEUTRAL,
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: '#eda100',
  in_progress: '#2a78d6',
  completed: STATUS.good,
  cancelled: NEUTRAL,
}

const leadStatusLabel = (status: string) => LEAD_STATUSES.find((s) => s.value === status)?.label ?? status
const taskStatusLabel = (status: string) => TASK_STATUSES.find((s) => s.value === status)?.label ?? status
const sourceLabel = (source: string) => LEAD_SOURCES.find((s) => s.value === source)?.label ?? source

// Colors by the source enum's fixed position, not by sorted rank, so a source keeps its
// color across dashboard loads even as by_source's count-desc order shifts day to day.
const sourceColor = (source: string) => {
  const index = LEAD_SOURCES.findIndex((s) => s.value === source)
  return CATEGORY_PALETTE[(index < 0 ? 0 : index) % CATEGORY_PALETTE.length]
}

// City/assignee have no fixed enum, so hash the key itself into a palette slot - same
// reasoning as chartColors.ts's "assign by stable key, never by rank" rule.
function stableColor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length]
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function BarList({
  rows,
  colorFor,
}: {
  // `key` is a stable identity for React + color assignment (e.g. an id), distinct from
  // `label` (what's displayed) - two rows can share a label (e.g. two staff named "Rahul")
  // without colliding, and colors stay tied to identity rather than whatever text is shown.
  rows: { key: string; label: string; count: number }[]
  colorFor: (key: string) => string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const pct = total ? Math.round((row.count / total) * 100) : 0
        const color = colorFor(row.key)
        return (
          <div key={row.key} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="w-28 shrink-0 truncate text-xs text-slate-600">{row.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, backgroundColor: color }} />
            </span>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-700">{row.count}</span>
            <span className="w-9 shrink-0 text-right text-[10px] text-slate-400">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { staff } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<DashboardSummary>('/crm/v1/dashboard/summary', { signal: controller.signal })
      .then((res) => setSummary(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard stats.')
      })
    return () => controller.abort()
  }, [])

  const leads = summary?.leads
  const tasks = summary?.tasks
  const maxMonthCount = leads ? Math.max(1, ...leads.by_month.map((m) => m.count)) : 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {staff?.name}</h1>
        <p className="text-sm text-slate-500">Here's what's happening in the CRM.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {leads && tasks && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Leads" value={leads.total} accent="#2a78d6" />
          <StatCard label="New This Week" value={leads.new_this_week} accent="#eda100" />
          <StatCard label="New This Month" value={leads.new_this_month} accent={CATEGORY_PALETTE[2]} />
          <StatCard label="Conversion Rate" value={`${leads.conversion_rate}%`} accent={STATUS.good} />
          <StatCard
            label="Overdue Tasks"
            value={tasks.overdue}
            accent={tasks.overdue > 0 ? STATUS.critical : STATUS.good}
          />
          <StatCard label="Due Today" value={tasks.due_today} accent={STATUS.warning} />
        </div>
      )}

      {leads && leads.by_month.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-sm font-medium text-slate-700">Leads by month</p>
          <div className="flex h-32 items-end gap-2">
            {leads.by_month.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${formatMonthLabel(m.month)}: ${m.count} leads`}>
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${(m.count / maxMonthCount) * 96 + 4}px`, backgroundColor: SEQUENTIAL_BLUE[200] }}
                />
                <span className="text-[10px] text-slate-500">{formatMonthLabel(m.month)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {leads && tasks && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leads.by_status.some((s) => s.count > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Leads by status</p>
              <BarList
                rows={leads.by_status.map((s) => ({ key: s.status, label: leadStatusLabel(s.status), count: s.count }))}
                colorFor={(k) => LEAD_STATUS_COLORS[k] ?? NEUTRAL}
              />
            </div>
          )}

          {leads.by_source.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Leads by source</p>
              <BarList
                rows={leads.by_source.map((s) => ({ key: s.source, label: sourceLabel(s.source), count: s.count }))}
                colorFor={sourceColor}
              />
            </div>
          )}

          {leads.by_city.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Top cities</p>
              <BarList
                rows={leads.by_city.map((c) => ({ key: c.city, label: c.city, count: c.count }))}
                colorFor={stableColor}
              />
            </div>
          )}

          {leads.by_assignee.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Leads by assignee</p>
              <BarList
                rows={leads.by_assignee.map((a) => ({
                  key: String(a.assigned_to ?? 'unassigned'),
                  label: a.name,
                  count: a.count,
                }))}
                colorFor={stableColor}
              />
            </div>
          )}

          {tasks.by_status.some((s) => s.count > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-slate-700">Tasks by status</p>
              <BarList
                rows={tasks.by_status.map((s) => ({ key: s.status, label: taskStatusLabel(s.status), count: s.count }))}
                colorFor={(k) => TASK_STATUS_COLORS[k] ?? NEUTRAL}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
