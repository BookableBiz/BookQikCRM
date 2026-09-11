import { useSyncExternalStore } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN_STORAGE_KEY = 'crm_token'

// Tracks in-flight apiRequest calls so the app can show one global loading
// indicator without every page wiring up its own request-tracking state.
let activeRequestCount = 0
const activeRequestListeners = new Set<() => void>()

function notifyActiveRequestListeners() {
  activeRequestListeners.forEach((listener) => listener())
}

export function subscribeToApiActivity(listener: () => void) {
  activeRequestListeners.add(listener)
  return () => activeRequestListeners.delete(listener)
}

export function getApiActivitySnapshot() {
  return activeRequestCount > 0
}

// True whenever one or more apiRequest calls are in flight, anywhere in the app.
export function useApiActivity() {
  return useSyncExternalStore(subscribeToApiActivity, getApiActivitySnapshot)
}

export interface ApiResponse<T = unknown> {
  status: boolean
  status_code: number
  message: string
  data?: T
}

export class ApiError extends Error {
  status_code: number

  constructor(message: string, status_code: number) {
    super(message)
    this.status_code = status_code
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal } = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, auth = true, signal } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  activeRequestCount += 1
  notifyActiveRequestListeners()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })

    const result = (await response.json()) as ApiResponse<T>

    if (!result.status) {
      throw new ApiError(result.message || 'Request failed', result.status_code ?? response.status)
    }

    return result
  } finally {
    activeRequestCount -= 1
    notifyActiveRequestListeners()
  }
}

// File exports (PDF/CSV) return a raw file body rather than the {status, data} JSON
// envelope apiRequest expects, so they need their own fetch -> blob -> save flow.
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) headers.Authorization = `Bearer ${token}`

  activeRequestCount += 1
  notifyActiveRequestListeners()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers })

    if (!response.ok) {
      const contentType = response.headers.get('Content-Type') ?? ''
      if (contentType.includes('application/json')) {
        const result = (await response.json()) as ApiResponse
        throw new ApiError(result.message || 'Download failed', result.status_code ?? response.status)
      }
      throw new ApiError('Download failed', response.status)
    }

    const disposition = response.headers.get('Content-Disposition') ?? ''
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
    const filename = filenameMatch?.[1] ?? fallbackFilename

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } finally {
    activeRequestCount -= 1
    notifyActiveRequestListeners()
  }
}

// Multipart file upload (e.g. CSV import) - apiRequest always JSON-encodes its body,
// which doesn't work for a File, so this builds its own FormData request instead.
export async function apiUpload<T = unknown>(path: string, file: File): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) headers.Authorization = `Bearer ${token}`

  const formData = new FormData()
  formData.append('file', file)

  activeRequestCount += 1
  notifyActiveRequestListeners()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: formData })
    const result = (await response.json()) as ApiResponse<T>

    if (!result.status) {
      throw new ApiError(result.message || 'Upload failed', result.status_code ?? response.status)
    }

    return result
  } finally {
    activeRequestCount -= 1
    notifyActiveRequestListeners()
  }
}

// Same as apiUpload, but for endpoints that need a file alongside other fields
// (e.g. logging a visit with notes/GPS coordinates plus an optional photo).
export async function apiUploadForm<T = unknown>(
  path: string,
  fields: Record<string, string | number | Blob | null | undefined>,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) headers.Authorization = `Bearer ${token}`

  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue
    formData.append(key, value instanceof Blob ? value : String(value))
  }

  activeRequestCount += 1
  notifyActiveRequestListeners()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: formData })
    const result = (await response.json()) as ApiResponse<T>

    if (!result.status) {
      throw new ApiError(result.message || 'Request failed', result.status_code ?? response.status)
    }

    return result
  } finally {
    activeRequestCount -= 1
    notifyActiveRequestListeners()
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}
