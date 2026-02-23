import { Link } from 'react-router-dom'
import { useHealth } from '../api/hooks'

export default function Home() {
  const { data, isSuccess } = useHealth()

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h1 style={{ marginTop: 0 }}>Nexin Launcher</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        React frontend instrumented with the Django API. Use the nav to inspect health and manage items.
      </p>
      <p>
        Backend status:{' '}
        {isSuccess && data ? (
          <span className="badge badge-ok">{data.service}: {data.status}</span>
        ) : (
          <span className="badge badge-error">Checking…</span>
        )}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Link to="/health" style={{ color: 'var(--accent)' }}>View API Health →</Link>
        <Link to="/items" style={{ color: 'var(--accent)' }}>Manage Items →</Link>
      </div>
    </div>
  )
}
