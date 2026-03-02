import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLfgGroup, useLfgJoin, useLfgLeave } from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${hours} hr${hours !== 1 ? 's' : ''}`
}

export default function LFGDetail() {
  const { lfgId } = useParams<{ lfgId: string }>()
  const { data: group, isLoading, isError, error } = useLfgGroup(lfgId ?? null)
  const joinGroup = useLfgJoin(lfgId ?? null)
  const leaveGroup = useLfgLeave(lfgId ?? null)
  const [discordId, setDiscordId] = useState('')
  const [leaveDiscordId, setLeaveDiscordId] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!discordId.trim()) return
    joinGroup.mutate(discordId.trim())
    setDiscordId('')
  }

  const handleLeave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveDiscordId.trim()) return
    leaveGroup.mutate(leaveDiscordId.trim())
    setLeaveDiscordId('')
  }

  if (isLoading || !lfgId) return <p>Loading…</p>
  if (isError || !group) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={{ color: 'var(--error)' }}>
          {error instanceof Error ? error.message : 'Group not found'}
        </p>
        <Link to="/lfg">← Back to LFG</Link>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>LFG group</h2>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {group.id}
            </p>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Created {formatDate(group.created_at)}
            </p>
            <p style={{ margin: '0.5rem 0 0' }}>
              <strong>Starts:</strong> {formatDate(group.start_time)} · <strong>Duration:</strong>{' '}
              {formatDuration(group.duration)}
              {group.max_party_size != null && (
                <> · <strong>Max party:</strong> {group.max_party_size}</>
              )}
            </p>
            {group.description && (
              <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{group.description}</p>
            )}
          </div>
          <Link to="/lfg" style={{ color: 'var(--text-muted)' }}>
            ← All groups
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Members ({group.members?.length ?? 0})</h3>
        {!group.members?.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No one has joined yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {group.members.map((m) => (
              <li
                key={`${m.discord_id}-${m.joined_at}`}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  marginBottom: '0.35rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>{m.username ?? m.discord_id}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  RSVP'd {formatDate(m.joined_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Join this group</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Enter your Discord user ID (snowflake) to RSVP. You'll appear in the members list.
        </p>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
          <div>
            <label htmlFor="lfg-join-discord-id">Discord ID</label>
            <input
              id="lfg-join-discord-id"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="e.g. 123456789012345678"
            />
          </div>
          <button type="submit" disabled={joinGroup.isPending || !discordId.trim()}>
            {joinGroup.isPending ? 'Joining…' : 'Join group'}
          </button>
          {joinGroup.isError && (
            <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
              {joinGroup.error instanceof Error ? joinGroup.error.message : 'Failed to join'}
            </p>
          )}
          {joinGroup.isSuccess && (
            <p style={{ color: 'var(--success)', fontSize: '0.875rem' }}>You're in! Refresh to see the list.</p>
          )}
        </form>
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Remove an RSVP</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Enter a Discord user ID (snowflake) to remove their RSVP from this group. The creator of
          the group cannot remove their own RSVP.
        </p>
        <form
          onSubmit={handleLeave}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}
        >
          <div>
            <label htmlFor="lfg-leave-discord-id">Discord ID</label>
            <input
              id="lfg-leave-discord-id"
              value={leaveDiscordId}
              onChange={(e) => setLeaveDiscordId(e.target.value)}
              placeholder="e.g. 123456789012345678"
            />
          </div>
          <button type="submit" disabled={leaveGroup.isPending || !leaveDiscordId.trim()}>
            {leaveGroup.isPending ? 'Removing…' : 'Remove RSVP'}
          </button>
          {leaveGroup.isError && (
            <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
              {leaveGroup.error instanceof Error ? leaveGroup.error.message : 'Failed to remove RSVP'}
            </p>
          )}
          {leaveGroup.isSuccess && (
            <p style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
              RSVP removed. Refresh to see the updated list.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
