import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCreateApp } from '../api/hooks'

export default function CreateApp() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const createApp = useCreateApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createApp.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (data) => {
          if (data.app_secret) {
            setCreatedSecret(data.app_secret)
          } else {
            navigate('/apps')
          }
        },
      }
    )
  }

  if (createdSecret) {
    return (
      <div className="card" style={{ marginTop: '1rem', maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>App created</h2>
        <p style={{ color: 'var(--error)', fontWeight: 600 }}>
          Copy your app secret now. You won’t be able to see it again.
        </p>
        <div
          style={{
            padding: '1rem',
            background: 'var(--bg)',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            wordBreak: 'break-all',
          }}
        >
          {createdSecret}
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Store it securely. Use it to authenticate as this app. You can generate a new secret later from the app’s page.
        </p>
        <Link to="/apps" style={{ color: 'var(--accent)', marginTop: '1rem', display: 'inline-block' }}>
          Back to Apps
        </Link>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>Create app</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="app-name">Name</label>
          <input
            id="app-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My App"
          />
        </div>
        <div>
          <label htmlFor="app-description">Description</label>
          <textarea
            id="app-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
          />
        </div>
        <button type="submit" disabled={createApp.isPending || !name.trim()}>
          {createApp.isPending ? 'Creating…' : 'Create app'}
        </button>
        {createApp.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
            {createApp.error instanceof Error ? createApp.error.message : 'Failed to create app'}
          </p>
        )}
      </form>
      <p style={{ marginTop: '1rem' }}>
        <Link to="/apps" style={{ color: 'var(--text-muted)' }}>← Back to Apps</Link>
      </p>
    </div>
  )
}
