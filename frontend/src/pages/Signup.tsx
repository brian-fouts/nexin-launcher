import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRegister } from '../api/hooks'

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
    <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Sign up</h2>
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
