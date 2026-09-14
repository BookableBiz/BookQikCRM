import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api'
import type { LeadVisitEntry } from '../../lib/types'
import { formatDateTime, inputClass } from './shared'

export interface VisitLogFields {
  [key: string]: string | number | Blob | undefined
  notes: string | undefined
  latitude: number | undefined
  longitude: number | undefined
  photo: File | undefined
}

// Geolocation is best-effort: if the browser has no support, permission is
// denied, or it just times out, the visit is still logged without coordinates
// (the backend field is nullable), matching how mobile only sends them when available.
function getCurrentCoords(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 5000 },
    )
  })
}

export function VisitLogPanel({ visits, onLog }: { visits: LeadVisitEntry[]; onLog: (fields: VisitLogFields) => Promise<unknown> }) {
  const [visitNotes, setVisitNotes] = useState('')
  const [visitPhoto, setVisitPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const coords = await getCurrentCoords()
      await onLog({
        notes: visitNotes || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        photo: visitPhoto ?? undefined,
      })
      setVisitNotes('')
      setVisitPhoto(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to log visit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Visit log</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={visitNotes}
          onChange={(e) => setVisitNotes(e.target.value)}
          placeholder="Notes from this visit (optional)…"
          rows={2}
          className={inputClass}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setVisitPhoto(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Logging…' : 'Log visit now'}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {visits.length === 0 && <p className="text-sm text-slate-400">No visits logged yet.</p>}
        {[...visits].reverse().map((visit, idx) => (
          <div key={idx} className="rounded-md bg-slate-50 p-3 text-sm">
            {visit.notes && <p className="text-slate-700">{visit.notes}</p>}
            {visit.photo_url && (
              <a href={visit.photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                <img src={visit.photo_url} alt="Visit" className="h-20 w-20 rounded-md object-cover" />
              </a>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {formatDateTime(visit.visited_at)}
              {visit.latitude != null && visit.longitude != null && (
                <>
                  {' '}
                  · {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
