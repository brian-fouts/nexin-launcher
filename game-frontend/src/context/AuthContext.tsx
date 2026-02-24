import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { LoginResponse } from '../api/client'

const STORAGE_KEY = 'gameUser'

/** Stored user may include server_id (set when joining via matchmaker with server_id in URL). */
export type StoredUser = LoginResponse & { server_id?: string }

function loadStoredUser(): StoredUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredUser
    if (data?.user_id) return data
  } catch {
    // ignore
  }
  return null
}

type AuthContextValue = {
  user: StoredUser | null
  setUser: (user: StoredUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(loadStoredUser)

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
