import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogin } from '../api/hooks'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
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
          navigate('/', { replace: true })
        },
      }
    )
  }

  return (
    <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Log in</h2>
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
