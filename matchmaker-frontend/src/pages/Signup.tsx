import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRegister } from '../api/hooks'

const discordAuthorizeUrl =
  (import.meta.env.VITE_DISCORD_AUTHORIZE_URL
    ? `${import.meta.env.VITE_DISCORD_AUTHORIZE_URL}/api/v1/auth/discord/authorize/`
    : `${import.meta.env.VITE_API_URL ?? ''}/api/v1/auth/discord/authorize/`).trim() || '/api/v1/auth/discord/authorize/'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setUserFromResponse } = useAuth()
  const register = useRegister()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !username.trim() || !password) return
    register.mutate(
      { email: email.trim(), username: username.trim(), password },
      {
        onSuccess: (data) => {
          setUserFromResponse(data)
          navigate('/', { replace: true })
        },
      }
    )
  }

  return (
    <div className="card" style={{ maxWidth: 400 }}>
      <div className="section-title" style={{ marginBottom: '0.5rem' }}>
        <div className="section-title-bar" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Sign up</h2>
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
        Sign up with Discord
      </a>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>or</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>
        <div>
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <button type="submit" disabled={register.isPending || !email.trim() || !username.trim() || !password}>
          {register.isPending ? 'Creating account…' : 'Sign up'}
        </button>
        {register.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
            {register.error instanceof Error ? register.error.message : 'Sign up failed'}
          </p>
        )}
      </form>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
      </p>
    </div>
  )
}
