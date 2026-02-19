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

export interface Item {
  id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  name: string
  description?: string
}

export interface ItemUpdate {
  name?: string
  description?: string
}

// --- Auth types ---

export interface User {
  user_id: string
  email: string
  username: string
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
  created_by_id: string
  created_by_username: string
  ip_address: string | null
  created_at: string
}

export interface ServerCreate {
  server_name: string
  server_description?: string
  game_modes?: Record<string, string>
}

export interface ServerUpdate {
  server_name?: string
  server_description?: string
  game_modes?: Record<string, string>
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
    refresh(refreshToken: string): Promise<AuthTokens> {
      return request<AuthTokens>(`${API_V1}/auth/token/refresh/`, {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      })
    },
  },

  items: {
    list(): Promise<Item[]> {
      return request<Item[]>(`${API_V1}/items/`)
    },
    get(id: number): Promise<Item> {
      return request<Item>(`${API_V1}/items/${id}/`)
    },
    create(data: ItemCreate): Promise<Item> {
      return request<Item>(`${API_V1}/items/`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    update(id: number, data: ItemUpdate): Promise<Item> {
      return request<Item>(`${API_V1}/items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    delete(id: number): Promise<void> {
      return request<void>(`${API_V1}/items/${id}/`, { method: 'DELETE' })
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
}
