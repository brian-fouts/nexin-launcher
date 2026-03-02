import { Link } from 'react-router-dom'
import { useLfgLeaveMine, useLfgMyRsvps } from '../api/hooks'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString()
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours} hr${hours !== 1 ? 's' : ''}`
}

export default function LFGMyRsvps() {
  const { data, isLoading, isError, error } = useLfgMyRsvps()
  const leaveMine = useLfgLeaveMine()

  if (isLoading) return <p>Loading…</p>
  if (isError) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={{ color: 'var(--error)' }}>
          {error instanceof Error ? error.message : 'Failed to load your RSVPs'}
        </p>
      </div>
    )
  }

  const items = data ?? []

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>My LFG RSVPs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          These are groups you have RSVP&apos;d to using your linked Discord account. You can remove
          RSVPs for groups you did not create.
        </p>
        <Link to="/lfg" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          ← Back to LFG
        </Link>
      </div>

      {!items.length ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            You haven&apos;t RSVP&apos;d to any groups yet.
          </p>
        </div>
      ) : (
        <div className="card">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item) => {
              const group = item.lfg
              const isCreator = group.created_by === group.created_by // placeholder, real check happens backend
              return (
                <li
                  key={`${group.id}-${item.joined_at}`}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '0.75rem 0.9rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <Link to={`/lfg/${group.id}`} style={{ fontWeight: 500 }}>
                        LFG {group.id.slice(0, 8)}…
                      </Link>
                      <p
                        style={{
                          margin: '0.25rem 0 0',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Starts {formatDateTime(group.start_time)} · Duration{' '}
                        {formatDuration(group.duration)}
                      </p>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      RSVP&apos;d {formatDateTime(item.joined_at)}
                    </p>
                  </div>
                  {group.description && (
                    <p
                      style={{
                        margin: '0.35rem 0 0',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {group.description}
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => leaveMine.mutate(group.id)}
                      disabled={leaveMine.isPending}
                    >
                      {leaveMine.isPending ? 'Removing…' : 'Remove my RSVP'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {leaveMine.isError && (
            <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {leaveMine.error instanceof Error
                ? leaveMine.error.message
                : 'Failed to remove RSVP'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

