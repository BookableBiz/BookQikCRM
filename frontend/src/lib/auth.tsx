import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from './api'
import type { CrmStaff } from './types'

const STAFF_STORAGE_KEY = 'crm_staff'

interface LoginResponseData {
  token: string
  staff: CrmStaff
}

interface AuthContextValue {
  staff: CrmStaff | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredStaff(): CrmStaff | null {
  if (!getAuthToken()) return null

  const raw = localStorage.getItem(STAFF_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CrmStaff
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<CrmStaff | null>(loadStoredStaff)

  async function login(email: string, password: string) {
    const result = await apiRequest<LoginResponseData>('/crm/v1/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })

    setAuthToken(result.data!.token)
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(result.data!.staff))
    setStaff(result.data!.staff)
  }

  function logout() {
    apiRequest('/crm/v1/logout', { method: 'POST' }).catch(() => {})
    clearAuthToken()
    localStorage.removeItem(STAFF_STORAGE_KEY)
    setStaff(null)
  }

  return <AuthContext.Provider value={{ staff, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { staff } = useAuth()
  if (!staff) {
    return <Navigate to="/login" replace />
  }
  return children
}
