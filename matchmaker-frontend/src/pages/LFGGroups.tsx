import { Link } from 'react-router-dom'
import { useLfgGroups } from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours} hr${hours !== 1 ? 's' : ''}`
}

export default function LFGGroups() {
  const { data: groups, isLoading, isError, error } = useLfgGroups()

  return (
    <div style={{ marginTop: '1rem' }}>
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Looking for group</h2>
        <Link
          to="/lfg/new"
          style={{
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          + Create group
        </Link>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Groups that are scheduled for the future or in progress. Create one or join with your Discord ID.
      </p>
      {isLoading && <p>Loading groups…</p>}
      {isError && (
        <p style={{ color: 'var(--error)' }}>
          {error instanceof Error ? error.message : 'Failed to load groups'}
        </p>
      )}
      {groups?.length === 0 && !isLoading && (
        <p style={{ color: 'var(--text-muted)' }}>No upcoming groups. Create one to get started.</p>
      )}
      {groups && groups.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {groups.map((group) => (
            <li
              key={group.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 8,
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/lfg/${group.id}`}
                    style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {group.description ? group.description.slice(0, 80) : 'No description'}
                    {group.description && group.description.length > 80 ? '…' : ''}
                  </Link>
                  {!group.description && (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Starts {formatDate(group.start_time)} · {formatDuration(group.duration)}
                    {group.max_party_size != null && ` · max ${group.max_party_size}`}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    by {group.created_by_username ?? group.created_by} · {group.members?.length ?? 0} member
                    {(group.members?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  to={`/lfg/${group.id}`}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  View / Join
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
