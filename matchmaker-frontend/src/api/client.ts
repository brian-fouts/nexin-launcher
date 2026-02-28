/**
 * Central API client. Use relative paths so Vite proxy (dev) or reverse proxy (prod) can forward to the backend.
 * Sends JWT Bearer token when available (see authStorage).
 */
import { getAccessToken } from './authStorage'

const BASE = import.meta.env.VITE_API_URL ?? ''
const API_V1 = '/api/v1'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(url, {
    ...options,
    headers,
  })
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

// --- Types (mirror backend DTOs) ---

export interface HealthResponse {
  status: string
  service: string
}

// --- Auth types ---

export interface User {
  user_id: string
  email: string
  username: string
  discord_id: string | null
  discord_username: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

/** Exchange app_id + app_secret for a JWT that authenticates as the app. No user auth required. */
export interface AppTokenPayload {
  app_id: string
  app_secret: string
}

export interface AppTokenResponse {
  access: string
  expires_in: number
}

// --- App types ---

export interface App {
  app_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  created_by_username: string
  created_by_id: string
  app_secret?: string // only present in create or regenerate response, once
}

export interface AppCreate {
  name: string
  description?: string
}

export interface AppUpdate {
  name?: string
  description?: string
}

// --- Server types ---

export interface Server {
  server_id: string
  app_id: string
  server_name: string
  server_description: string
  game_modes: Record<string, string>
  created_by_id: string | null
  created_by_username: string | null
  ip_address: string | null
  port: number | null
  game_frontend_url: string | null
  created_at: string
}

export interface ServerCreate {
  server_name: string
  server_description?: string
  game_modes?: Record<string, string>
  port?: number
  game_frontend_url?: string | null
}

export interface ServerUpdate {
  server_name?: string
  server_description?: string
  game_modes?: Record<string, string>
  port?: number
  game_frontend_url?: string | null
}

export interface OnlineUser {
  user_id: string
  username: string
}

// --- Discord LFG types ---

export interface LFGMember {
  discord_id: string
  /** Username when the Discord account is linked to a matchmaker account; otherwise null */
  username: string | null
  joined_at: string
}

export interface LFGGroup {
  id: string
  created_at: string
  created_by: string
  /** Username when the creator's Discord is linked to a matchmaker account */
  created_by_username: string | null
  start_time: string
  duration: number
  max_party_size: number | null
  description: string
  members: LFGMember[]
}

export interface LFGGroupCreate {
  /** Omit when authenticated; backend uses request.user.discord_id */
  created_by?: string
  start_time: string
  duration: number
  max_party_size?: number | null
  description?: string
}

// --- Endpoints ---

export const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>(`${API_V1}/health/`)
  },

  auth: {
    register(payload: RegisterPayload): Promise<AuthResponse> {
      return request<AuthResponse>(`${API_V1}/auth/register/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    login(payload: LoginPayload): Promise<AuthResponse> {
      return request<AuthResponse>(`${API_V1}/auth/login/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    /** Current user from JWT (e.g. after Discord callback). */
    me(): Promise<{ user: User }> {
      return request<{ user: User }>(`${API_V1}/auth/me/`)
    },
    /** Exchange Discord OAuth code + state for user and tokens (DISCORD_FRONTEND_REDIRECT flow). */
    discordExchange(code: string, state: string): Promise<AuthResponse> {
      return request<AuthResponse>(`${API_V1}/auth/discord/exchange/`, {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      })
    },
    /** Link Discord to current account (requires user JWT). Use after redirect from link authorize. */
    discordLinkExchange(code: string, state: string): Promise<AuthResponse> {
      return request<AuthResponse>(`${API_V1}/auth/discord/link/exchange/`, {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      })
    },
    refresh(refreshToken: string): Promise<AuthTokens> {
      return request<AuthTokens>(`${API_V1}/auth/token/refresh/`, {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      })
    },
    /** Exchange app_id and app_secret for a JWT that authenticates as the app (Bearer token). */
    appToken(payload: AppTokenPayload): Promise<AppTokenResponse> {
      return request<AppTokenResponse>(`${API_V1}/auth/app-token/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  },

  apps: {
    list(): Promise<App[]> {
      return request<App[]>(`${API_V1}/apps/`)
    },
    get(appId: string): Promise<App> {
      return request<App>(`${API_V1}/apps/${appId}/`)
    },
    create(data: AppCreate): Promise<App> {
      return request<App>(`${API_V1}/apps/`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    update(appId: string, data: AppUpdate): Promise<App> {
      return request<App>(`${API_V1}/apps/${appId}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    delete(appId: string): Promise<void> {
      return request<void>(`${API_V1}/apps/${appId}/`, { method: 'DELETE' })
    },
    regenerateSecret(appId: string): Promise<{ app_secret: string }> {
      return request<{ app_secret: string }>(`${API_V1}/apps/${appId}/regenerate-secret/`, {
        method: 'POST',
      })
    },
    generateOneTimeToken(appId: string): Promise<{ token: string; expires_in: number }> {
      return request<{ token: string; expires_in: number }>(`${API_V1}/apps/${appId}/one-time-token/`, {
        method: 'POST',
      })
    },
    servers: {
      list(appId: string): Promise<Server[]> {
        return request<Server[]>(`${API_V1}/apps/${appId}/servers/`)
      },
      get(appId: string, serverId: string): Promise<Server> {
        return request<Server>(`${API_V1}/apps/${appId}/servers/${serverId}/`)
      },
      create(appId: string, data: ServerCreate): Promise<Server> {
        return request<Server>(`${API_V1}/apps/${appId}/servers/`, {
          method: 'POST',
          body: JSON.stringify(data),
        })
      },
      update(appId: string, serverId: string, data: ServerUpdate): Promise<Server> {
        return request<Server>(`${API_V1}/apps/${appId}/servers/${serverId}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      },
      delete(appId: string, serverId: string): Promise<void> {
        return request<void>(`${API_V1}/apps/${appId}/servers/${serverId}/`, { method: 'DELETE' })
      },
      onlineUsers(appId: string, serverId: string): Promise<OnlineUser[]> {
        return request<OnlineUser[]>(`${API_V1}/apps/${appId}/servers/${serverId}/online-users/`)
      },
    },
  },
  oneTimeToken: {
    validate(token: string): Promise<{ user_id: string; username: string; app_id: string }> {
      return request<{ user_id: string; username: string; app_id: string }>(`${API_V1}/one-time-token/validate/`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
    },
  },

  discord: {
    lfg: {
      listGroups(): Promise<LFGGroup[]> {
        return request<LFGGroup[]>(`${API_V1}/discord/lfg/groups/`)
      },
      get(lfgId: string): Promise<LFGGroup> {
        return request<LFGGroup>(`${API_V1}/discord/lfg/${lfgId}/`)
      },
      create(data: LFGGroupCreate): Promise<LFGGroup> {
        return request<LFGGroup>(`${API_V1}/discord/lfg/`, {
          method: 'POST',
          body: JSON.stringify(data),
        })
      },
      join(lfgId: string, discordId: string): Promise<LFGMember> {
        return request<LFGMember>(`${API_V1}/discord/lfg/${lfgId}/join/`, {
          method: 'POST',
          body: JSON.stringify({ discord_id: discordId }),
        })
      },
    },
  },
}
