import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useValidateOneTimeToken } from '../api/hooks'

export default function ValidateToken() {
  const [token, setToken] = useState('')
  const validate = useValidateOneTimeToken()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return
    validate.mutate(trimmed)
  }

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Validate one-time token</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Paste a one-time JWT to consume it and get the user and app. The token is single-use and will be invalid after validation.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="token">Token</label>
          <textarea
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste JWT here…"
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </div>
        <button type="submit" disabled={validate.isPending || !token.trim()}>
          {validate.isPending ? 'Validating…' : 'Validate token'}
        </button>
      </form>
      {validate.isError && (
        <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
          {validate.error instanceof Error ? validate.error.message : 'Validation failed'}
        </p>
      )}
      {validate.isSuccess && validate.data && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Result</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', margin: 0 }}>
            <dt style={{ color: 'var(--text-muted)' }}>User ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
              {validate.data.user_id}
            </dd>
            <dt style={{ color: 'var(--text-muted)' }}>Username</dt>
            <dd style={{ margin: 0 }}>{validate.data.username}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>App ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
              {validate.data.app_id}
            </dd>
          </dl>
        </div>
      )}
      <p style={{ marginTop: '1rem' }}>
        <Link to="/apps" style={{ color: 'var(--text-muted)' }}>← Apps</Link>
      </p>
    </div>
  )
}
