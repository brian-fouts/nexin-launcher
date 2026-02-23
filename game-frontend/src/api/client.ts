/**
 * API client for game-backend. Uses relative paths so Vite proxy forwards to game-backend.
 */
const BASE = import.meta.env.VITE_GAME_API_URL ?? ''
const API_V1 = '/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    throw new ApiError(res.status, body)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`API error ${status}`)
    this.name = 'ApiError'
  }
}

export interface HealthResponse {
  status: string
  service: string
}

export interface LoginResponse {
  user_id: string
  username: string
  app_id: string
}

export const gameApi = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>(`${API_V1}/health/`)
  },

  login(ticket: string): Promise<LoginResponse> {
    return request<LoginResponse>(`${API_V1}/login/`, {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    })
  },

  /** Report that the current user is still online. Call every ~10s while on the game page. */
  heartbeat(userId: string): Promise<void> {
    return request<void>(`${API_V1}/heartbeat/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    })
  },
}
