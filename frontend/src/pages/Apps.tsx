import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApps, useServers } from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

function ServerListForApp({ appId }: { appId: string }) {
  const { data: servers, isLoading } = useServers(appId)
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
        borderRadius: 8,
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
              borderRadius: 6,
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
            }}
          >
            <strong>{s.server_name}</strong>
            {s.server_description && (
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>— {s.server_description}</span>
            )}
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hosted by {s.created_by_username}
              {s.ip_address && ` · ${s.ip_address}`}
              {' · '}{formatDate(s.created_at)}
            </p>
            {s.game_modes && Object.keys(s.game_modes).length > 0 && (
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {Object.entries(s.game_modes).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
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
    <div style={{ marginTop: '1rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Apps</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/apps/validate-token" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
            Validate token
          </Link>
          <Link to="/apps/new" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            + Create app
          </Link>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        All apps in the system. You can create apps and manage the ones you created.
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
                  borderRadius: 8,
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
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: 8,
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
