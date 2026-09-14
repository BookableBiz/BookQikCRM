import { TASK_STATUSES, type TaskStatus } from '../lib/types'

export function taskStatusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function TaskStatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: TaskStatus
  disabled?: boolean
  onChange: (status: TaskStatus) => void
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
