import { useState } from 'react'
import { useCreateItem, useDeleteItem, useItems, useUpdateItem } from '../api/hooks'
import type { Item } from '../api/client'

function formatDate(s: string) {
  return new Date(s).toLocaleString()
}

export default function Items() {
  const { data: items, isLoading, isError, error } = useItems()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const [editing, setEditing] = useState<Item | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createItem.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
        },
      }
    )
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    updateItem.mutate(
      { id: editing.id, data: { name: name.trim() || undefined, description: description.trim() || undefined } },
      { onSuccess: () => setEditing(null) }
    )
  }

  const startEdit = (item: Item) => {
    setEditing(item)
    setName(item.name)
    setDescription(item.description)
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Items</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Create and manage items via the backend API.
        </p>

        {!editing ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
            <div>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <button type="submit" disabled={createItem.isPending || !name.trim()}>
              {createItem.isPending ? 'Creating…' : 'Create item'}
            </button>
            {createItem.isError && (
              <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                {createItem.error instanceof Error ? createItem.error.message : 'Failed to create'}
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
            <div>
              <label htmlFor="edit-name">Name</label>
              <input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(null); setName(''); setDescription(''); }}
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            </div>
            {updateItem.isError && (
              <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                {updateItem.error instanceof Error ? updateItem.error.message : 'Failed to update'}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>List</h3>
        {isLoading && <p>Loading items…</p>}
        {isError && (
          <p style={{ color: 'var(--error)' }}>
            {error instanceof Error ? error.message : 'Failed to load items'}
          </p>
        )}
        {items?.length === 0 && !isLoading && <p style={{ color: 'var(--text-muted)' }}>No items yet. Create one above.</p>}
        {items && items.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  {item.description && (
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {item.description}
                    </p>
                  )}
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Updated {formatDate(item.updated_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem.mutate(item.id)}
                    disabled={deleteItem.isPending}
                    style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--error)' }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
