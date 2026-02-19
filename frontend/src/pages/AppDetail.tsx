import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  useApp,
  useCreateServer,
  useDeleteApp,
  useGenerateOneTimeToken,
  useRegenerateAppSecret,
  useServers,
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
  const generateOneTimeToken = useGenerateOneTimeToken()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null)
  const [serverName, setServerName] = useState('')
  const [serverDescription, setServerDescription] = useState('')
  const [gameModesEntries, setGameModesEntries] = useState<Array<{ id: string; key: string; value: string }>>([
    { id: crypto.randomUUID(), key: '', value: '' },
  ])

  const { data: servers, isLoading: serversLoading } = useServers(appId ?? null)
  const createServer = useCreateServer(appId ?? null)

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

  const handleGenerateOneTimeToken = () => {
    if (!appId) return
    setOneTimeToken(null)
    generateOneTimeToken.mutate(appId, {
      onSuccess: (data) => setOneTimeToken(data.token),
    })
  }

  const addGameModeRow = () => {
    setGameModesEntries((prev) => [...prev, { id: crypto.randomUUID(), key: '', value: '' }])
  }

  const removeGameModeRow = (id: string) => {
    setGameModesEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))
  }

  const updateGameModeEntry = (id: string, field: 'key' | 'value', value: string) => {
    setGameModesEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  const handleCreateServer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId || !serverName.trim()) return
    const game_modes: Record<string, string> = {}
    gameModesEntries.forEach((e) => {
      const k = e.key.trim()
      if (k) game_modes[k] = e.value.trim()
    })
    createServer.mutate(
      { server_name: serverName.trim(), server_description: serverDescription.trim() || undefined, game_modes },
      {
        onSuccess: () => {
          setServerName('')
          setServerDescription('')
          setGameModesEntries([{ id: crypto.randomUUID(), key: '', value: '' }])
        },
      }
    )
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

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>One-time token</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          A JWT that encodes your user and this app. Valid for 60 seconds; only one valid at a time per user/app. Single use.
        </p>
        <button
          type="button"
          onClick={handleGenerateOneTimeToken}
          disabled={generateOneTimeToken.isPending}
        >
          {generateOneTimeToken.isPending ? 'Generating…' : 'Generate one-time token'}
        </button>
        {generateOneTimeToken.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {generateOneTimeToken.error instanceof Error ? generateOneTimeToken.error.message : 'Failed'}
          </p>
        )}
        {oneTimeToken && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {oneTimeToken}
          </div>
        )}
        <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.875rem' }}>
          <Link to="/apps/validate-token" style={{ color: 'var(--accent)' }}>Validate a token →</Link>
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Servers</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Instances of this app that users host. Your IP is captured when you create a server.
        </p>
        <form onSubmit={handleCreateServer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480, marginBottom: '1.5rem' }}>
          <div>
            <label htmlFor="server-name">Server name</label>
            <input
              id="server-name"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="My Server"
            />
          </div>
          <div>
            <label htmlFor="server-description">Description</label>
            <textarea
              id="server-description"
              value={serverDescription}
              onChange={(e) => setServerDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
          <div>
            <label>Game modes (key-value pairs)</label>
            {gameModesEntries.map((entry) => (
              <div
                key={entry.id}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}
              >
                <input
                  value={entry.key}
                  onChange={(e) => updateGameModeEntry(entry.id, 'key', e.target.value)}
                  placeholder="Key"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <input
                  value={entry.value}
                  onChange={(e) => updateGameModeEntry(entry.id, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={() => removeGameModeRow(entry.id)}
                  style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}
                  title="Remove row"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addGameModeRow} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', marginTop: '0.25rem' }}>
              + Add game mode
            </button>
          </div>
          <button type="submit" disabled={createServer.isPending || !serverName.trim()}>
            {createServer.isPending ? 'Creating…' : 'Add server'}
          </button>
          {createServer.isError && (
            <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
              {createServer.error instanceof Error ? createServer.error.message : 'Failed'}
            </p>
          )}
        </form>
        {serversLoading && <p>Loading servers…</p>}
        {servers && servers.length === 0 && !serversLoading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No servers yet.</p>
        )}
        {servers && servers.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {servers.map((s) => (
              <li
                key={s.server_id}
                style={{
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  borderLeft: '3px solid var(--accent)',
                }}
              >
                <strong>{s.server_name}</strong>
                {s.server_description && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {s.server_description}</span>}
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
                  by {s.created_by_username}
                  {s.ip_address && ` · ${s.ip_address}`}
                  {' · '}{formatDate(s.created_at)}
                </p>
                {s.game_modes && Object.keys(s.game_modes).length > 0 && (
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {Object.entries(s.game_modes).map(([k, v]) => (
                      <li key={k}>{k}: {v}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

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
