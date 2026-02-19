import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  useApp,
  useDeleteApp,
  useRegenerateAppSecret,
  useUpdateApp,
} from '../api/hooks'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

export default function AppDetail() {
  const { appId } = useParams<{ appId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: app, isLoading, isError, error } = useApp(appId ?? null)
  const updateApp = useUpdateApp()
  const deleteApp = useDeleteApp()
  const regenerateSecret = useRegenerateAppSecret()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const isOwner = app && user.user_id === app.created_by_id

  useEffect(() => {
    if (app) {
      setName(app.name)
      setDescription(app.description)
    }
  }, [app])

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId || !app) return
    updateApp.mutate(
      { appId, data: { name: name.trim() || undefined, description: description.trim() || undefined } },
      { onSuccess: () => setEditing(false) }
    )
  }

  const handleRegenerate = () => {
    if (!appId) return
    if (!confirm('Generate a new app secret? The current secret will stop working.')) return
    regenerateSecret.mutate(appId, {
      onSuccess: (data) => setNewSecret(data.app_secret),
    })
  }

  const handleDelete = () => {
    if (!appId) return
    if (!confirm('Delete this app? This cannot be undone.')) return
    deleteApp.mutate(appId, {
      onSuccess: () => navigate('/apps'),
    })
  }

  if (isLoading || !appId) return <p>Loading…</p>
  if (isError || !app) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <p style={{ color: 'var(--error)' }}>
          {error instanceof Error ? error.message : 'App not found'}
        </p>
        <Link to="/apps">Back to Apps</Link>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>{app.name}</h2>
            {isOwner && <span className="badge badge-ok">Your app</span>}
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              by {app.created_by_username} · created {formatDate(app.created_at)} · updated {formatDate(app.updated_at)}
            </p>
            {app.description && (
              <p style={{ margin: '0.5rem 0 0' }}>{app.description}</p>
            )}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              App ID: {app.app_id}
            </p>
          </div>
          <Link to="/apps" style={{ color: 'var(--text-muted)' }}>← Apps</Link>
        </div>
      </div>

      {newSecret && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--accent)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--error)' }}>New app secret</h3>
          <p style={{ color: 'var(--error)', fontWeight: 600 }}>Copy it now. You won’t see it again.</p>
          <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
            {newSecret}
          </div>
          <button type="button" onClick={() => setNewSecret(null)} style={{ marginTop: '0.75rem' }}>
            Done
          </button>
        </div>
      )}

      {isOwner && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Manage app</h3>
          {!editing ? (
            <>
              <button type="button" onClick={() => setEditing(true)} style={{ marginRight: '0.5rem' }}>
                Edit name & description
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerateSecret.isPending}
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', marginRight: '0.5rem' }}
              >
                {regenerateSecret.isPending ? 'Regenerating…' : 'Regenerate app secret'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteApp.isPending}
                style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--error)' }}
              >
                Delete app
              </button>
            </>
          ) : (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
              <div>
                <label htmlFor="edit-name">Name</label>
                <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="edit-description">Description</label>
                <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={updateApp.isPending}>
                  {updateApp.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditing(false)} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
              {updateApp.isError && (
                <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                  {updateApp.error instanceof Error ? updateApp.error.message : 'Update failed'}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}
