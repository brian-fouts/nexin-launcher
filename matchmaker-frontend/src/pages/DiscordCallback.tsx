import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

/**
 * Discord OAuth2 callback. Discord redirects here (DISCORD_FRONTEND_REDIRECT) with
 * ?code=...&state=...; we send code+state to backend exchange and get user + tokens.
 */
export default function DiscordCallback() {
  const navigate = useNavigate()
  const { setUserFromResponse } = useAuth()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error) {
      setErrorCode(error)
      setStatus('error')
      return
    }
    if (!code || !state) {
      setErrorCode('missing_code')
      setStatus('error')
      return
    }

    api.auth
      .discordExchange(code, state)
      .then((data) => {
        setUserFromResponse(data)
        setStatus('ok')
        navigate('/', { replace: true })
      })
      .catch((err: { body?: { detail?: string } }) => {
        setErrorCode(err?.body?.detail ?? 'exchange_failed')
        setStatus('error')
      })
  }, [navigate, setUserFromResponse])

  if (status === 'loading') {
    return (
      <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
        <p>Completing Discord sign in…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, color: 'var(--error)' }}>Discord sign in failed</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {errorCode === 'invalid_state' && 'Invalid or expired state. Please try again.'}
          {errorCode === 'token_exchange_failed' && 'Could not exchange code for token. Try again.'}
          {errorCode === 'user_fetch_failed' && 'Could not load your Discord profile.'}
          {errorCode === 'not_configured' && 'Discord login is not configured on the server.'}
          {errorCode === 'missing_code' && 'No authorization code received. Try starting sign in again.'}
          {errorCode === 'exchange_failed' && 'Could not complete sign in. Try again.'}
          {!errorCode && 'Something went wrong.'}
        </p>
        <Link to="/login" style={{ color: 'var(--accent)' }}>
          Back to log in
        </Link>
      </div>
    )
  }

  return null
}
