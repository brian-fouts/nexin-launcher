import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCreateLfgGroup } from '../api/hooks'

export default function CreateLFG() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createGroup = useCreateLfgGroup()
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('1')
  const [maxPartySize, setMaxPartySize] = useState('')
  const [description, setDescription] = useState('')

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startTime || !duration) return
    const durationNum = parseFloat(duration)
    if (Number.isNaN(durationNum) || durationNum <= 0) return
    const max = maxPartySize.trim() ? parseInt(maxPartySize, 10) : undefined
    if (maxPartySize.trim() && (Number.isNaN(max) || max < 1)) return
    createGroup.mutate(
      {
        start_time: startTime,
        duration: durationNum,
        max_party_size: max ?? null,
        description: description.trim() || undefined,
      },
      {
        onSuccess: (data) => navigate(`/lfg/${data.id}`),
      }
    )
  }

  const durationNum = parseFloat(duration)
  const maxNum = maxPartySize.trim() ? parseInt(maxPartySize, 10) : null
  const isValid =
    startTime &&
    !Number.isNaN(durationNum) &&
    durationNum > 0 &&
    (maxNum === null || (!Number.isNaN(maxNum) && maxNum >= 1))

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div className="section-title">
        <div className="section-title-bar" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Create LFG group</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', marginLeft: 12 }}>
        You'll be added as the first member (using your linked Discord account). Start time and duration are in your local timezone.
      </p>
      {!user.discord_id && (
        <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Link your Discord account in <Link to="/account">My Account</Link> to create an LFG group.
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="lfg-start-time">Start time</label>
          <input
            id="lfg-start-time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="lfg-duration">Duration (hours)</label>
          <input
            id="lfg-duration"
            type="number"
            min="0.25"
            step="0.25"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <label htmlFor="lfg-max-party">Max party size (optional)</label>
          <input
            id="lfg-max-party"
            type="number"
            min="1"
            value={maxPartySize}
            onChange={(e) => setMaxPartySize(e.target.value)}
            placeholder="Leave empty for no limit"
          />
        </div>
        <div>
          <label htmlFor="lfg-description">Description (optional)</label>
          <textarea
            id="lfg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the session about?"
            rows={3}
          />
        </div>
        <button type="submit" disabled={createGroup.isPending || !isValid || !user.discord_id}>
          {createGroup.isPending ? 'Creating…' : 'Create group'}
        </button>
        {createGroup.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
            {createGroup.error instanceof Error ? createGroup.error.message : 'Failed to create group'}
          </p>
        )}
      </form>
      <p style={{ marginTop: '1rem' }}>
        <Link to="/lfg" style={{ color: 'var(--text-muted)' }}>
          ← Back to LFG
        </Link>
      </p>
    </div>
  )
}
