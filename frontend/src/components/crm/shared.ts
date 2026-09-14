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
