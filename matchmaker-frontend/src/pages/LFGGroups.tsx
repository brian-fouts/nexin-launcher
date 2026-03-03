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
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <div className="section-title">
          <div className="section-title-bar" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            Looking For Group
          </h1>
        </div>
        <Link
          to="/lfg/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            borderRadius: 2,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
            background: '#E8000E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            textDecoration: 'none',
            transition: 'filter 0.2s',
          }}
        >
          + Create group
        </Link>
      </div>
      <p className="section-description">
        Groups that are scheduled for the future or in progress. Create one or join with your Discord ID.
      </p>

      {isLoading && (
        <p style={{ color: 'var(--text-muted)' }}>Loading groups…</p>
      )}
      {isError && (
        <div className="panel-row">
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Error</span>
          <span className="badge badge-error">
            {error instanceof Error ? error.message : 'Failed to load groups'}
          </span>
        </div>
      )}
      {groups?.length === 0 && !isLoading && (
        <p style={{ color: 'var(--text-muted)' }}>No upcoming groups. Create one to get started.</p>
      )}
      {groups && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/lfg/${group.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="panel-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div className="panel-row-accent" />
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                      {group.description ? group.description.slice(0, 80) : 'No description'}
                      {group.description && group.description.length > 80 ? '…' : ''}
                    </span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                      Starts {formatDate(group.start_time)} · {formatDuration(group.duration)}
                      {group.max_party_size != null && ` · max ${group.max_party_size}`}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      by {group.created_by_username ?? group.created_by} · {group.members?.length ?? 0} member
                      {(group.members?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', flexShrink: 0 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
