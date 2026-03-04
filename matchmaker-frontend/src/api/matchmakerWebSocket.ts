/**
 * Connects to the matchmaker backend WebSocket and invalidates React Query cache
 * when apps, servers, or online users change so the UI updates immediately.
 * Started from main.tsx with the app's QueryClient so no React hooks are used
 * (avoids "invalid hook call" / "dispatcher is null" on some environments).
 */
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'

type WsMessage =
  | { kind: 'apps' }
  | { kind: 'servers'; app_id: string }
  | { kind: 'online_users'; app_id: string; server_id: string }

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl?.trim()) return envUrl.replace(/\/$/, '') + '/ws/matchmaker/'
  const base = typeof window !== 'undefined' ? window.location : null
  if (!base) return ''
  const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${base.host}/ws/matchmaker/`
}

export function startMatchmakerWebSocket(queryClient: QueryClient): void {
  const url = getWsUrl()
  if (!url) return

  let ws: WebSocket
  let reconnectTimeout: ReturnType<typeof setTimeout>

  const connect = () => {
    ws = new WebSocket(url)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        if (msg.kind === 'apps') {
          queryClient.invalidateQueries({ queryKey: queryKeys.apps.all })
        } else if (msg.kind === 'servers' && msg.app_id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.apps.servers(msg.app_id) })
        } else if (msg.kind === 'online_users' && msg.app_id && msg.server_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.apps.serverOnlineUsers(msg.app_id, msg.server_id),
          })
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      reconnectTimeout = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  connect()
}
