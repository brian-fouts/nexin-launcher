const ACCESS_KEY = 'nexin_access_token'
const REFRESH_KEY = 'nexin_refresh_token'
const USER_KEY = 'nexin_user'

export interface StoredUser {
  user_id: string
  email: string
  username: string
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function setUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function clearAuth(): void {
  clearTokens()
  clearUser()
}
