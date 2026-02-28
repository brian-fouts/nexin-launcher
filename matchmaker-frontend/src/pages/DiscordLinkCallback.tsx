import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

/**
 * Callback after "Link Discord" flow. Discord redirects here (DISCORD_FRONTEND_REDIRECT_LINK)
 * with ?code=...&state=...; we send code+state to backend link/exchange (with JWT) and get updated user + tokens.
 */
export default function DiscordLinkCallback() {
  const navigate = useNavigate()
  const { user, setUserFromResponse } = useAuth()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setErrorCode('not_logged_in')
      setStatus('error')
      return
    }
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
      .discordLinkExchange(code, state)
      .then((data) => {
        setUserFromResponse(data)
        setStatus('ok')
        navigate('/account', { replace: true })
      })
      .catch((err: { body?: { detail?: string } }) => {
        setErrorCode(err?.body?.detail ?? 'exchange_failed')
        setStatus('error')
      })
  }, [user, navigate, setUserFromResponse])

  if (status === 'loading') {
    return (
      <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
        <p>Linking Discord account…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card" style={{ maxWidth: 400, marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, color: 'var(--error)' }}>Link Discord failed</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {errorCode === 'not_logged_in' && 'You must be logged in to link Discord.'}
          {errorCode === 'invalid_state' && 'Invalid or expired state. Try again.'}
          {errorCode === 'token_exchange_failed' && 'Could not exchange code. Try again.'}
          {errorCode === 'user_fetch_failed' && 'Could not load your Discord profile.'}
          {errorCode === 'discord_already_linked' && 'This Discord account is already linked to another account.'}
          {errorCode === 'app_token_not_allowed' && 'Use your user account to link Discord.'}
          {errorCode === 'missing_code' && 'No authorization code received. Try again from My Account.'}
          {errorCode === 'exchange_failed' && 'Could not complete link. Try again.'}
          {!errorCode && 'Something went wrong.'}
        </p>
        <Link to="/account" style={{ color: 'var(--accent)' }}>
          Back to My Account
        </Link>
      </div>
    )
  }

  return null
}
