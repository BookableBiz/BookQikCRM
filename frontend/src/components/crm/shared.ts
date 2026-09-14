import type { CrmStaffMember } from '../../lib/types'

export const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

export function formatDateTime(value: string) {
  return new Date(value.replace(' ', 'T')).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function staffLabel(staffList: CrmStaffMember[], id: number | null) {
  if (!id) return 'Unassigned'
  const match = staffList.find((s) => s.id === id)
  return match ? `${match.name} (${match.role})` : `#${id}`
}

// value is a date-only string (YYYY-MM-DD, possibly with a time suffix); parse the date
// part as local time, not UTC midnight, so timezones behind UTC don't display the previous day.
export function formatWeekLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
