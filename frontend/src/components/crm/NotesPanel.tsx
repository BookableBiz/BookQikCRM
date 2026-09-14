import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import type { LeadNoteEntry } from '../../lib/types'
import { formatDateTime, inputClass } from './shared'

export function NotesPanel({ notes, onAdd }: { notes: LeadNoteEntry[]; onAdd: (content: string) => Promise<unknown> }) {
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!noteText.trim()) return
    setSaving(true)
    try {
      await onAdd(noteText)
      setNoteText('')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to add note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {notes.length === 0 && <p className="text-sm text-slate-400">No notes yet.</p>}
        {[...notes].reverse().map((note, idx) => (
          <div key={idx} className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-slate-700">{note.content}</p>
            <p className="mt-1 text-xs text-slate-400">{formatDateTime(note.added_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
