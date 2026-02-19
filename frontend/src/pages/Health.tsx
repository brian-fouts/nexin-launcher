import { useHealth } from '../api/hooks'

export default function Health() {
  const { data, isLoading, isError, error } = useHealth()

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>API Health</h2>
      {isLoading && <p>Loading…</p>}
      {isError && (
        <p>
          <span className="badge badge-error">Error</span>{' '}
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}
      {data && (
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
          <dt style={{ color: 'var(--text-muted)' }}>Status</dt>
          <dd>
            <span className="badge badge-ok">{data.status}</span>
          </dd>
          <dt style={{ color: 'var(--text-muted)' }}>Service</dt>
          <dd>{data.service}</dd>
        </dl>
      )}
    </div>
  )
}
