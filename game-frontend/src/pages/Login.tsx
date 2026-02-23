import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { gameApi, ApiError, type LoginResponse } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [searchParams] = useSearchParams()
  const ticket = searchParams.get('ticket')
  const { setUser } = useAuth()

  const [result, setResult] = useState<LoginResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorBody, setErrorBody] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const requestStartedForTicket = useRef<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!ticket) {
      setResult(null)
      setError(null)
      setErrorBody(null)
      setLoading(false)
      requestStartedForTicket.current = null
      return
    }
    if (requestStartedForTicket.current === ticket) {
      cancelledRef.current = false
      return
    }
    requestStartedForTicket.current = ticket
    cancelledRef.current = false
    setLoading(true)
    setError(null)
    setErrorBody(null)
    setResult(null)
    gameApi
      .login(ticket)
      .then((data) => {
        if (!cancelledRef.current) {
          setResult(data)
          setUser(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelledRef.current) {
          const message = err instanceof ApiError && typeof err.body === 'object' && err.body !== null && 'detail' in err.body
            ? String((err.body as { detail: unknown }).detail)
            : err instanceof Error
              ? err.message
              : 'Login failed'
          setError(message)
          setErrorBody(err instanceof ApiError ? err.body : null)
          setLoading(false)
        }
      })
    return () => {
      cancelledRef.current = true
    }
  }, [ticket])

  if (ticket == null || ticket === '') {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Open this page with a <code style={{ background: 'var(--border)', padding: '0.2rem 0.4rem', borderRadius: 4 }}>ticket</code> URL
          parameter to sign in. For example: <code style={{ background: 'var(--border)', padding: '0.2rem 0.4rem', borderRadius: 4 }}>/login?ticket=your-token</code>
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      {loading && <p style={{ color: 'var(--text-muted)' }}>Validating ticket…</p>}
      {error && (
        <p>
          <span className="badge badge-error">Error</span> {error}
        </p>
      )}
      {result && (
        <>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
            <dt style={{ color: 'var(--text-muted)' }}>User ID</dt>
            <dd>{result.user_id}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Username</dt>
            <dd>{result.username}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>App ID</dt>
            <dd>{result.app_id}</dd>
          </dl>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Server response:</p>
          <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--surface)', borderRadius: 6, fontSize: '0.8125rem', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
      {error && (
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Server response</summary>
          <pre style={{ margin: '0.5rem 0 0', padding: '0.75rem', background: 'var(--surface)', borderRadius: 6, fontSize: '0.8125rem', overflow: 'auto' }}>
            {errorBody != null ? JSON.stringify(errorBody, null, 2) : error}
          </pre>
        </details>
      )}
    </div>
  )
}
