import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogin } from '../api/hooks'

const discordAuthorizeUrl =
  (import.meta.env.VITE_DISCORD_AUTHORIZE_URL
    ? `${import.meta.env.VITE_DISCORD_AUTHORIZE_URL}/api/v1/auth/discord/authorize/`
    : `${import.meta.env.VITE_API_URL ?? ''}/api/v1/auth/discord/authorize/`).trim() || '/api/v1/auth/discord/authorize/'

export default function Login() {
  const [username, setUsername] = useState('test')
  const [password, setPassword] = useState('test')
  const navigate = useNavigate()
  const location = useLocation()
  const { setUserFromResponse } = useAuth()
  const login = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: (data) => {
          setUserFromResponse(data)
          const search = new URLSearchParams(location.search)
          const next = search.get('next') || '/'
          navigate(next, { replace: true })
        },
      }
    )
  }

  return (
    <div className="card" style={{ maxWidth: 400 }}>
      <div className="section-title" style={{ marginBottom: '0.5rem' }}>
        <div className="section-title-bar" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Log in</h2>
      </div>
      <a
        href={discordAuthorizeUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          marginBottom: '1rem',
          background: '#5865F2',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Log in with Discord
      </a>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>or</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="login-username">Username or email</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username or email"
          />
        </div>
        <div>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <button type="submit" disabled={login.isPending || !username.trim() || !password}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
        {login.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
            {login.error instanceof Error ? login.error.message : 'Login failed'}
          </p>
        )}
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Don’t have an account? <Link to="/signup" style={{ color: 'var(--accent)' }}>Sign up</Link>
      </p>
    </div>
  )
}
