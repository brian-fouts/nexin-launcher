import { useState } from 'react'
import type { RoomStatusPlayer, RoomStatusRoom } from '../api/client'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApps, useCreateRoom, useGenerateOneTimeToken, useServerOnlineUsers, useServers } from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

function ServerOnlineUsers({ appId, serverId }: { appId: string; serverId: string }) {
  const [expanded, setExpanded] = useState(false)
  const { data: users, isLoading } = useServerOnlineUsers(appId, serverId)
  const count = users?.length ?? 0
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}
      >
        {isLoading ? '…' : `${count} user${count !== 1 ? 's' : ''} online`} {expanded ? '▼' : '▶'}
      </button>
      {expanded && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.35rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {users?.length === 0 ? (
            <li>No one online on this server.</li>
          ) : (
            users?.map((u) => (
              <li key={u.user_id} style={{ padding: '0.15rem 0' }}>
                {u.username || u.user_id}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function roomPlayersDisplay(players: RoomStatusRoom['current_players']): { label: string; key: string }[] {
  if (!players?.length) return []
  const isEnriched = typeof players[0] === 'object' && players[0] !== null && 'user_id' in (players[0] as object)
  return (players as (RoomStatusPlayer | string)[]).map((p, i) =>
    isEnriched
      ? { label: (p as RoomStatusPlayer).username || (p as RoomStatusPlayer).user_id, key: (p as RoomStatusPlayer).user_id }
      : { label: String(p), key: `${i}-${p}` }
  )
}

function ServerListForApp({ appId }: { appId: string }) {
  const { data: servers, isLoading } = useServers(appId)
  const generateOneTimeToken = useGenerateOneTimeToken()
  const createRoom = useCreateRoom(appId)
  const [expandedRoomKey, setExpandedRoomKey] = useState<string | null>(null)

  if (isLoading) return <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Loading servers…</p>
  if (!servers?.length) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
        No active servers
      </p>
    )
  }
  return (
    <div
      style={{
        marginTop: '0.5rem',
        border: '1px solid var(--border)',
        borderRadius: 2,
        padding: '0.75rem',
        background: 'var(--bg)',
      }}
    >
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', fontWeight: 600 }}>
        Active servers ({servers.length})
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {servers.map((s) => (
          <li
            key={s.server_id}
            style={{
              fontSize: '0.875rem',
              padding: '0.6rem 0.75rem',
              background: 'var(--surface)',
              borderRadius: 2,
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
            }}
          >
            <strong>{s.server_name}</strong>
            {s.server_description && (
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>— {s.server_description}</span>
            )}
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hosted by {s.created_by_username ?? '—'}
              {s.ip_address && ` · ${s.ip_address}`}
              {s.port != null && ` · Port ${s.port}`}
              {' · '}{formatDate(s.created_at)}
            </p>
            <ServerOnlineUsers appId={appId} serverId={s.server_id} />
            {s.game_modes && Object.keys(s.game_modes).length > 0 && (
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {Object.entries(s.game_modes).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            )}
            {s.room_config && typeof s.room_config.max_rooms === 'number' && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  This server uses rooms. Create a room or join an existing one to play.
                </p>
                {(() => {
                  const statusRooms = s.room_status?.rooms ?? []
                  const capacity = s.room_config.capacity_per_room ?? 2
                  const activeRoomCount = statusRooms.length
                  const reservedCount = s.rooms?.length ?? 0
                  const roomCount = Math.max(activeRoomCount, reservedCount)
                  const canCreate = roomCount < (s.room_config?.max_rooms ?? 0)
                  return (
                    <>
                      <p style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                        Active rooms ({roomCount} / {s.room_config.max_rooms})
                        {s.room_config.capacity_per_room != null && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                            · {s.room_config.capacity_per_room} players per room
                          </span>
                        )}
                      </p>
                      {statusRooms.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          No active rooms. Create one to start.
                        </p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                          {statusRooms.map((r: RoomStatusRoom) => {
                            const shortId = r.room_id.slice(0, 8)
                            const count = (r.current_players ?? []).length
                            const cap = r.capacity ?? capacity
                            const roomKey = `${s.server_id}:${r.room_id}`
                            const isExpanded = expandedRoomKey === roomKey
                            const players = roomPlayersDisplay(r.current_players ?? [])
                            return (
                              <li
                                key={r.room_id}
                                style={{
                                  marginBottom: '0.35rem',
                                  padding: '0.35rem',
                                  background: 'var(--bg)',
                                  borderRadius: 4,
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRoomKey((k) => (k === roomKey ? null : roomKey))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      fontSize: '0.75rem',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                    }}
                                    aria-expanded={isExpanded}
                                  >
                                    {isExpanded ? '▼' : '▶'}
                                  </button>
                                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                    Room {shortId}… · {count}/{cap} users
                                  </span>
                                  {s.game_frontend_url && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        generateOneTimeToken.mutate(appId, {
                                          onSuccess: (data) => {
                                            const base = s.game_frontend_url!.replace(/\/$/, '')
                                            const params = new URLSearchParams({
                                              ticket: data.token,
                                              server_id: s.server_id,
                                              room_id: r.room_id,
                                            })
                                            window.open(`${base}/login?${params}`, '_blank', 'noopener,noreferrer')
                                          },
                                        })
                                      }}
                                      disabled={generateOneTimeToken.isPending}
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                                    >
                                      Join room
                                    </button>
                                  )}
                                </div>
                                {isExpanded && (
                                  <ul style={{ listStyle: 'none', padding: '0.35rem 0 0 1.25rem', margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {players.length === 0 ? (
                                      <li>No users in this room</li>
                                    ) : (
                                      players.map((u) => (
                                        <li key={u.key} style={{ padding: '0.15rem 0' }}>
                                          {u.label || u.key}
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      {canCreate && s.game_frontend_url && (
                        <p style={{ margin: '0.5rem 0 0' }}>
                          <button
                            type="button"
                            onClick={() => {
                              createRoom.mutate(s.server_id, {
                                onSuccess: (roomData) => {
                                  generateOneTimeToken.mutate(appId, {
                                    onSuccess: (tokenData) => {
                                      const base = (roomData.game_frontend_url ?? s.game_frontend_url)!.replace(/\/$/, '')
                                      const params = new URLSearchParams({
                                        ticket: tokenData.token,
                                        server_id: roomData.server_id,
                                        room_id: roomData.room_id,
                                      })
                                      window.open(`${base}/login?${params}`, '_blank', 'noopener,noreferrer')
                                    },
                                  })
                                },
                              })
                            }}
                            disabled={createRoom.isPending}
                            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.6rem' }}
                          >
                            {createRoom.isPending ? 'Creating…' : 'Create room'}
                          </button>
                          {createRoom.isError && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--error)', fontSize: '0.75rem' }}>
                              {createRoom.error instanceof Error ? createRoom.error.message : 'Failed'}
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
            {s.game_frontend_url && !(s.room_config && typeof s.room_config.max_rooms === 'number') && (
              <p style={{ margin: '0.5rem 0 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    generateOneTimeToken.mutate(appId, {
                      onSuccess: (data) => {
                        const base = s.game_frontend_url!.replace(/\/$/, '')
                        const params = new URLSearchParams({ ticket: data.token, server_id: s.server_id })
                        window.open(`${base}/login?${params}`, '_blank', 'noopener,noreferrer')
                      },
                    })
                  }}
                  disabled={generateOneTimeToken.isPending}
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.6rem' }}
                >
                  {generateOneTimeToken.isPending ? 'Generating…' : 'Join'}
                </button>
                {generateOneTimeToken.isError && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--error)', fontSize: '0.75rem' }}>
                    {generateOneTimeToken.error instanceof Error ? generateOneTimeToken.error.message : 'Failed'}
                  </span>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Apps() {
  const { user } = useAuth()
  const { data: apps, isLoading, isError, error } = useApps()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div className="section-title">
          <div className="section-title-bar" />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Apps</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/apps/validate-token" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
            Validate token
          </Link>
          <Link
            to="/apps/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderRadius: 2,
              fontSize: '0.75rem',
              background: '#E8000E',
              color: '#fff',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            + Create app
          </Link>
        </div>
      </div>
      <p className="section-description">
        Installed and available applications in your Nexin ecosystem.
      </p>
      {isLoading && <p>Loading apps…</p>}
      {isError && (
        <p style={{ color: 'var(--error)' }}>
          {error instanceof Error ? error.message : 'Failed to load apps'}
        </p>
      )}
      {apps?.length === 0 && !isLoading && (
        <p style={{ color: 'var(--text-muted)' }}>No apps yet. Create one to get started.</p>
      )}
      {apps && apps.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {apps.map((app) => {
            const isOwner = user.user_id === app.created_by_id
            return (
              <li
                key={app.app_id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 2,
                marginBottom: '0.5rem',
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/apps/${app.app_id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                      {app.name}
                    </Link>
                    {isOwner && (
                      <span className="badge badge-ok" style={{ marginLeft: '0.5rem' }}>Yours</span>
                    )}
                    {app.description && (
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {app.description}
                      </p>
                    )}
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      by {app.created_by_username} · updated {formatDate(app.updated_at)}
                    </p>
                    <ServerListForApp appId={app.app_id} />
                  </div>
                  <Link
                    to={`/apps/${app.app_id}`}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: '#E8000E',
                    color: 'white',
                    borderRadius: 2,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                  >
                    {isOwner ? 'Manage' : 'View'}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
