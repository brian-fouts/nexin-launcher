import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { AuthResponse } from '../api/client'
import { clearAuth, getUser, setTokens, setUser } from '../api/authStorage'

type AuthContextValue = {
  user: ReturnType<typeof getUser>
  setUserFromResponse: (data: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState(getUser) // init from localStorage on load

  const setUserFromResponse = useCallback((data: AuthResponse) => {
    setTokens(data.tokens.access, data.tokens.refresh)
    setUser(data.user)
    setUserState(data.user)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUserState(null)
  }, [])

  const value = useMemo(
    () => ({ user, setUserFromResponse, logout }),
    [user, setUserFromResponse, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
