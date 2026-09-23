import { useState, type FormEvent } from 'react'
import type { VaultEntry, VaultEntryInput } from '@jpass/core'

interface VaultEntryRowProps {
  entry: VaultEntry
  busy: boolean
  onUpdate: (id: string, input: VaultEntryInput) => void
  onDelete: (id: string) => void
}

export function VaultEntryRow({ entry, busy, onUpdate, onDelete }: VaultEntryRowProps) {
  const [editing, setEditing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [site, setSite] = useState(entry.site)
  const [username, setUsername] = useState(entry.username)
  const [password, setPassword] = useState(entry.password)

  async function copyToClipboard(text: string, field: 'username' | 'password') {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // Clipboard may be unavailable; ignore for MVP
    }
  }

  function startEditing() {
    setSite(entry.site)
    setUsername(entry.username)
    setPassword(entry.password)
    setEditing(true)
    setRevealed(false)
  }

  function cancelEditing() {
    setEditing(false)
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault()
    onUpdate(entry.id, { site, username, password })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="jpass-vault__item jpass-vault__item--editing">
        <form className="jpass-vault__edit-form" onSubmit={handleEditSubmit}>
          <input
            className="jpass__input"
            type="text"
            placeholder="Site or label"
            value={site}
            onChange={(event) => setSite(event.target.value)}
            required
            disabled={busy}
          />
          <input
            className="jpass__input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={busy}
          />
          <input
            className="jpass__input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={busy}
          />
          <div className="jpass-vault__row-actions">
            <button className="jpass-vault__action" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              className="jpass-vault__action"
              type="button"
              onClick={cancelEditing}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="jpass-vault__item">
      <div className="jpass-vault__item-header">
        <span className="jpass-vault__site">{entry.site}</span>
        <div className="jpass-vault__row-actions">
          <button
            className="jpass-vault__action"
            type="button"
            onClick={startEditing}
            disabled={busy}
          >
            Edit
          </button>
          <button
            className="jpass-vault__action jpass-vault__action--danger"
            type="button"
            onClick={() => onDelete(entry.id)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="jpass-vault__field">
        <span className="jpass-vault__label">Username</span>
        <span className="jpass-vault__value">{entry.username || '—'}</span>
        {entry.username ? (
          <button
            className="jpass-vault__action"
            type="button"
            onClick={() => copyToClipboard(entry.username, 'username')}
            disabled={busy}
          >
            {copiedField === 'username' ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </div>
      <div className="jpass-vault__field">
        <span className="jpass-vault__label">Password</span>
        <span className="jpass-vault__value jpass-vault__value--secret">
          {revealed ? entry.password : '••••••••'}
        </span>
        <button
          className="jpass-vault__action"
          type="button"
          onClick={() => setRevealed((value) => !value)}
          disabled={busy}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
        <button
          className="jpass-vault__action"
          type="button"
          onClick={() => copyToClipboard(entry.password, 'password')}
          disabled={busy}
        >
          {copiedField === 'password' ? 'Copied' : 'Copy'}
        </button>
      </div>
    </li>
  )
}
