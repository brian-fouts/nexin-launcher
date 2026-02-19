import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApps } from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
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
                  <div>
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
