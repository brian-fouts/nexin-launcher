import { useHealth } from '../api/hooks'

export default function Health() {
  const { data, isLoading, isError, error } = useHealth()

  return (
    <div>
      <div className="section-title">
        <div className="section-title-bar" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          API Health
        </h1>
      </div>
      <p className="section-description">
        Real-time monitoring for all connected services and endpoints.
      </p>

      {isLoading && (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      )}
      {isError && (
        <div className="panel-row">
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Error</span>
          <span className="badge badge-error">
            {error instanceof Error ? error.message : String(error)}
          </span>
        </div>
      )}
      {data && (
        <div className="panel-row">
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
            {data.service} — {data.status}
          </span>
          <span className="badge badge-ok">{data.status}</span>
        </div>
      )}
    </div>
  )
}
