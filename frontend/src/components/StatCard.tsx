import { STATUS } from '../lib/chartColors'

export function StatCard({
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
