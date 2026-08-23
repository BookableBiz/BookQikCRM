import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../lib/api'
import type { LeadNote, Paginated } from '../lib/types'

export default function NotesPage() {
  const [notes, setNotes] = useState<LeadNote[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<Paginated<LeadNote>>('/crm/v1/notes')
      .then((res) => setNotes(res.data!.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load notes.'))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Notes</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && !notes && <p className="text-sm text-slate-500">Loading…</p>}

      {notes && notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}

      {notes && notes.length > 0 && (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span className="font-medium text-slate-900">{note.leadname}</span>
                <span>by {note.addedby}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
