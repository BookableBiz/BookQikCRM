const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN_STORAGE_KEY = 'crm_token'

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
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const result = (await response.json()) as ApiResponse<T>

  if (!result.status) {
    throw new ApiError(result.message || 'Request failed', result.status_code ?? response.status)
  }

  return result
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
