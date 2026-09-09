import { useEffect, useRef, useState } from 'react'
<<<<<<< HEAD
import { apiDownload, apiRequest, ApiError } from '../lib/api'
=======
import { apiRequest, ApiError } from '../lib/api'
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
import type {
  AssetCampaignBucket,
  AssetsCampaignSummary,
  AssetType,
  Paginated,
  VendorAssetsCampaignRow,
} from '../lib/types'
import { StatCard } from '../components/StatCard'
import { STATUS } from '../lib/chartColors'

const ASSET_TYPES: { key: AssetType; label: string }[] = [
  { key: 'qr', label: 'QR code' },
  { key: 'decal_door', label: 'Decal door' },
  { key: 'welcome_desk_poster', label: 'Welcome Desk poster' },
  { key: 'large_poster', label: 'Large poster' },
]

const TABS: { key: AssetCampaignBucket; label: string }[] = [
  { key: 'not_started', label: 'Not started' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'approved', label: 'Approved' },
]

interface RowState extends VendorAssetsCampaignRow {
  noteDraft: string
  savingNote: boolean
  noteError: string | null
  // Staged uncheck of "Approved" awaiting a required note - the server still has
  // this vendor as approved until saveNote() persists it, so the checkbox and
  // server truth are kept separate to avoid the unapprove looking saved when it isn't.
  pendingUnapprove: boolean
}

function hasAnyAssetPlaced(row: VendorAssetsCampaignRow) {
  return Object.values(row.assets).some(Boolean)
}

<<<<<<< HEAD
// Shared by the list fetch and the export download so an exported report can never
// silently drift from what the current tab/search box is actually showing on screen.
function buildFilterParams(bucket: AssetCampaignBucket, debouncedSearch: string) {
  const params = new URLSearchParams()
  params.set('bucket', bucket)
  if (debouncedSearch) params.set('search', debouncedSearch)
  return params
}

=======
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
function toRowState(row: VendorAssetsCampaignRow): RowState {
  return { ...row, noteDraft: row.audit_note ?? '', savingNote: false, noteError: null, pendingUnapprove: false }
}

// Refetches after a mutation must not stomp on rows the admin is still mid-edit on
// (an unsaved note draft, or a staged unapprove waiting on that note) - otherwise
// toggling one vendor's checkbox silently discards another vendor's in-progress edit.
function mergeRowState(fresh: VendorAssetsCampaignRow, prev: RowState | undefined): RowState {
  const base = toRowState(fresh)
  if (!prev) return base
  const isDirty = prev.pendingUnapprove || prev.savingNote || prev.noteDraft !== (fresh.audit_note ?? '')
  if (!isDirty) return base
  return {
    ...base,
    noteDraft: prev.noteDraft,
    noteError: prev.noteError,
    savingNote: prev.savingNote,
    pendingUnapprove: prev.pendingUnapprove,
  }
}

export default function AssetsCampaignPage() {
  const [summary, setSummary] = useState<AssetsCampaignSummary | null>(null)
  const [bucket, setBucket] = useState<AssetCampaignBucket>('not_started')
  const [rows, setRows] = useState<Paginated<VendorAssetsCampaignRow> | null>(null)
  const [rowStates, setRowStates] = useState<RowState[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
<<<<<<< HEAD
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
=======
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [bucket, debouncedSearch])

  // Every fetch below is guarded by an AbortController tied to its own effect run, the
  // same pattern VendorsPage uses - without it, a slower unfiltered response can resolve
  // after a faster filtered one and silently overwrite the correct filtered state.
  useEffect(() => {
    const controller = new AbortController()

    apiRequest<AssetsCampaignSummary>('/crm/v1/assets-campaign/summary', { signal: controller.signal })
      .then((res) => setSummary(res.data ?? null))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSummary(null)
      })

    return () => controller.abort()
  }, [reloadToken])

  // A mutation bumps reloadToken to refresh this list (a placement/approval change can move
  // a vendor into a different bucket), but that refresh shouldn't flash the whole table's
  // loading state - only do that when the filters themselves changed.
  const filterKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

<<<<<<< HEAD
    const params = buildFilterParams(bucket, debouncedSearch)
=======
    const params = new URLSearchParams()
    params.set('bucket', bucket)
    if (debouncedSearch) params.set('search', debouncedSearch)
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
    params.set('page', String(page))

    const filterKey = `${bucket}|${debouncedSearch}|${page}`
    const isBackgroundRefresh = filterKeyRef.current === filterKey
    filterKeyRef.current = filterKey

    if (!isBackgroundRefresh) setLoading(true)
    setError(null)

    apiRequest<Paginated<VendorAssetsCampaignRow>>(`/crm/v1/assets-campaign?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        setRows(res.data ?? null)
        setRowStates((prev) => {
          const prevById = new Map(prev.map((r) => [r.id, r]))
          return (res.data?.data ?? []).map((row) => mergeRowState(row, prevById.get(row.id)))
        })
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Failed to load vendors.')
      })
      .finally(() => {
        if (!controller.signal.aborted && !isBackgroundRefresh) setLoading(false)
      })

    return () => controller.abort()
  }, [bucket, debouncedSearch, page, reloadToken])

  function refreshAfterMutation() {
    setReloadToken((t) => t + 1)
  }

<<<<<<< HEAD
  // A PDF export can take a while to generate server-side; guard against updating state
  // after the admin has already navigated away from this page.
  const isMountedRef = useRef(true)
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Exports mirror the current tab and search box, not the current page - a sales/audit
  // download that silently dropped everything past page 1 would be worse than none at all.
  async function handleExport(format: 'pdf' | 'excel') {
    setExporting(format)
    setError(null)

    const params = buildFilterParams(bucket, debouncedSearch)
    params.set('format', format)

    try {
      await apiDownload(
        `/crm/v1/assets-campaign/export?${params.toString()}`,
        `assets-campaign-${bucket}.${format === 'excel' ? 'csv' : 'pdf'}`,
      )
    } catch (err) {
      if (isMountedRef.current) setError(err instanceof ApiError ? err.message : 'Failed to download report.')
    } finally {
      if (isMountedRef.current) setExporting(null)
    }
  }

=======
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
  async function togglePlacement(vendorId: number, assetType: AssetType, next: boolean) {
    setRowStates((prev) =>
      prev.map((r) => (r.id === vendorId ? { ...r, assets: { ...r.assets, [assetType]: next } } : r)),
    )

    try {
      await apiRequest(`/crm/v1/assets-campaign/${vendorId}/placement`, {
        method: 'PUT',
        body: { asset_type: assetType, placed: next },
      })
      refreshAfterMutation()
    } catch (err) {
      setRowStates((prev) =>
        prev.map((r) => (r.id === vendorId ? { ...r, assets: { ...r.assets, [assetType]: !next } } : r)),
      )
      setError(err instanceof ApiError ? err.message : 'Failed to update placement.')
    }
  }

  async function approveVendor(vendorId: number) {
    setRowStates((prev) =>
      prev.map((r) =>
        r.id === vendorId
          ? { ...r, approved: true, pendingUnapprove: false, noteDraft: '', noteError: null }
          : r,
      ),
    )

    try {
      await apiRequest(`/crm/v1/assets-campaign/${vendorId}/approval`, {
        method: 'PUT',
        body: { approved: true },
      })
      refreshAfterMutation()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve vendor.')
      refreshAfterMutation()
    }
  }

  // Matches the backend's own rule (CrmAssetsCampaignService::updateApproval): a note is
  // only required when the vendor has assets placed. So when nothing is placed we can
  // persist the uncheck immediately, same as approveVendor; otherwise we stage it locally
  // until saveNote() actually persists it, rather than flipping `approved` to false and
  // implying it's already saved when it isn't.
  async function unapproveVendor(vendorId: number) {
    const row = rowStates.find((r) => r.id === vendorId)
    if (!row) return

    if (!hasAnyAssetPlaced(row)) {
      setRowStates((prev) =>
        prev.map((r) =>
          r.id === vendorId ? { ...r, approved: false, pendingUnapprove: false, noteDraft: '', noteError: null } : r,
        ),
      )

      try {
        await apiRequest(`/crm/v1/assets-campaign/${vendorId}/approval`, {
          method: 'PUT',
          body: { approved: false },
        })
        refreshAfterMutation()
      } catch (err) {
        setRowStates((prev) => prev.map((r) => (r.id === vendorId ? { ...r, approved: true } : r)))
        setError(err instanceof ApiError ? err.message : 'Failed to update approval.')
      }
      return
    }

    setRowStates((prev) => prev.map((r) => (r.id === vendorId ? { ...r, pendingUnapprove: true, noteError: null } : r)))
  }

  function setNoteDraft(vendorId: number, value: string) {
    setRowStates((prev) => prev.map((r) => (r.id === vendorId ? { ...r, noteDraft: value, noteError: null } : r)))
  }

  async function saveNote(vendorId: number) {
    const row = rowStates.find((r) => r.id === vendorId)
    if (!row) return

    if (!row.noteDraft.trim()) {
      setRowStates((prev) =>
        prev.map((r) => (r.id === vendorId ? { ...r, noteError: 'Note required until this vendor is approved.' } : r)),
      )
      return
    }

    setRowStates((prev) => prev.map((r) => (r.id === vendorId ? { ...r, savingNote: true, noteError: null } : r)))

    try {
      await apiRequest(`/crm/v1/assets-campaign/${vendorId}/approval`, {
        method: 'PUT',
        body: { approved: false, note: row.noteDraft.trim() },
      })
      setRowStates((prev) =>
        prev.map((r) =>
          r.id === vendorId
            ? { ...r, savingNote: false, approved: false, pendingUnapprove: false, audit_note: row.noteDraft.trim() }
            : r,
        ),
      )
      refreshAfterMutation()
    } catch (err) {
      setRowStates((prev) =>
        prev.map((r) =>
          r.id === vendorId
            ? { ...r, savingNote: false, noteError: err instanceof ApiError ? err.message : 'Failed to save note.' }
            : r,
        ),
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Assets Campaign</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sales ticks off whichever assets are placed at the vendor. An auditor then gives one final approval per
          vendor — or leaves it unticked and explains why.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Vendors tracked" value={summary.vendor_count} accent="#2a78d6" />
          <StatCard label="Assets placed" value={`${summary.placed_total} / ${summary.placed_possible}`} accent="#eda100" />
          <StatCard label="Vendors approved" value={summary.approved_count} accent={STATUS.good} />
          <StatCard label="Flagged" value={summary.flagged_count} accent={STATUS.critical} />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Search by name or ID</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
<<<<<<< HEAD
            placeholder="e.g. Ram or 1234"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting === 'excel' ? 'Preparing…' : 'Download Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
=======
            placeholder="e.g. Sneha or 1234"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const count = summary?.buckets[tab.key]
          const isActive = tab.key === bucket
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBucket(tab.key)}
              className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {count !== undefined && <span className="ml-1 text-slate-400">({count})</span>}
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
<<<<<<< HEAD
              <th className="px-4 py-3 font-medium">Pincode</th>
=======
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
              {ASSET_TYPES.map((at) => (
                <th key={at.key} className="min-w-[120px] px-4 py-3 font-medium">
                  {at.label}
                </th>
              ))}
              <th className="min-w-[240px] border-l border-slate-200 px-4 py-3 font-medium">Auditor approval</th>
            </tr>
          </thead>
          <tbody>
            {rowStates.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 align-top text-slate-500">#{row.id}</td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.business_name ?? '—'}</div>
                </td>
<<<<<<< HEAD
                <td className="px-4 py-3 align-top text-slate-700">{row.pincode ?? '—'}</td>
=======
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
                {ASSET_TYPES.map((at) => (
                  <td key={at.key} className="px-4 py-3 align-top">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.assets[at.key]}
                        onChange={(e) => togglePlacement(row.id, at.key, e.target.checked)}
                        className="h-4 w-4 accent-slate-900"
                      />
                      Placed
                    </label>
                  </td>
                ))}
                <td className="border-l border-slate-200 px-4 py-3 align-top">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={row.approved && !row.pendingUnapprove}
                      onChange={(e) => (e.target.checked ? approveVendor(row.id) : unapproveVendor(row.id))}
                      className="h-4 w-4 accent-green-600"
                    />
                    Approved
                  </label>

                  {(!row.approved || row.pendingUnapprove) && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <textarea
                        value={row.noteDraft}
                        onChange={(e) => setNoteDraft(row.id, e.target.value)}
                        placeholder="Why isn't this approved? (required)"
                        className="min-h-[52px] w-full rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-red-400"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveNote(row.id)}
                          disabled={row.savingNote}
                          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          {row.savingNote ? 'Saving…' : 'Save note'}
                        </button>
                        {row.noteError && <p className="text-xs text-red-600">{row.noteError}</p>}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {!loading && rowStates.length === 0 && (
              <tr>
<<<<<<< HEAD
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
=======
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
>>>>>>> 713ef3844fda33f19e2042e0d822da02510fa6d5
                  No vendors in this stage right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}
      </div>

      {rows && rows.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {rows.current_page} of {rows.last_page} · {rows.total} vendors
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= rows.last_page}
              onClick={() => setPage((p) => Math.min(rows.last_page, p + 1))}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
