import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { LoginResponse } from '../api/client'

const STORAGE_KEY = 'gameUser'

function loadStoredUser(): LoginResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as LoginResponse
    if (data?.user_id) return data
  } catch {
    // ignore
  }
  return null
}

type AuthContextValue = {
  user: LoginResponse | null
  setUser: (user: LoginResponse | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<LoginResponse | null>(loadStoredUser)

  const setUser = useCallback((next: LoginResponse | null) => {
    setUserState(next)
    if (next) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value = useMemo(() => ({ user, setUser }), [user, setUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
