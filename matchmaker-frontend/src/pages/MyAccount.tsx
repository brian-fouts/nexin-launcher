import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDiscordLinkAuthorizeUrl } from '../api/authUrls'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function MyAccount() {
  const { user } = useAuth()
  const discordLinkAuthorizeUrl = getDiscordLinkAuthorizeUrl()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const hasDiscord = !!user.discord_id

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>My Account</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Your account details (non-private information). You can sign in with username+password or Discord.
      </p>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.5rem 1.5rem',
          margin: 0,
          alignItems: 'baseline',
        }}
      >
        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Username</dt>
        <dd style={{ margin: 0 }}>{user.username}</dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Email</dt>
        <dd style={{ margin: 0 }}>{user.email}</dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>User ID</dt>
        <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>{user.user_id}</dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Discord</dt>
        <dd style={{ margin: 0 }}>
          {hasDiscord ? (
            <span>
              Linked as <strong>{user.discord_username || 'Discord user'}</strong>
              {user.discord_id && (
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.875rem' }}> ({user.discord_id})</span>
              )}
            </span>
          ) : (
            <a
              href={discordLinkAuthorizeUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                background: '#5865F2',
                color: '#fff',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Link Discord account
            </a>
          )}
        </dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Joined</dt>
        <dd style={{ margin: 0 }}>{formatDate(user.created_at)}</dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Last updated</dt>
        <dd style={{ margin: 0 }}>{formatDate(user.updated_at)}</dd>

        <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Last login</dt>
        <dd style={{ margin: 0 }}>{formatDate(user.last_login_at)}</dd>
      </dl>
    </div>
  )
}
