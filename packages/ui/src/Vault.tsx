import { useState, type FormEvent } from 'react'
import type { VaultEntry, VaultEntryInput } from '@jpass/core'
import { JPassLogo } from './JPassLogo'
import { VaultEntryRow } from './VaultEntryRow'
import './app.css'
import './login.css'
import './vault.css'

export interface VaultProps {
  userEmail: string | null
  entries: VaultEntry[]
  loading: boolean
  saving: boolean
  mutatingEntryId: string | null
  error: string | null
  onSaveEntry: (entry: VaultEntryInput) => void
  onUpdateEntry: (id: string, entry: VaultEntryInput) => void
  onDeleteEntry: (id: string) => void
  onLogout: () => void
}

export function Vault({
  userEmail,
  entries,
  loading,
  saving,
  mutatingEntryId,
  error,
  onSaveEntry,
  onUpdateEntry,
  onDeleteEntry,
  onLogout,
}: VaultProps) {
  const [site, setSite] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSaveEntry({ site, username, password })
    setSite('')
    setUsername('')
    setPassword('')
  }

  return (
    <main className="jpass">
      <header className="jpass__header">
        <JPassLogo />
        <h1 className="jpass__title">JPass</h1>
      </header>
      <p className="jpass__subtitle">Signed in as {userEmail}</p>

      <form className="jpass__form" onSubmit={handleSubmit}>
        <input
          className="jpass__input"
          type="text"
          placeholder="Site or label"
          value={site}
          onChange={(event) => setSite(event.target.value)}
          required
          disabled={saving}
        />
        <input
          className="jpass__input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={saving}
        />
        <input
          className="jpass__input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={saving}
        />
        {error && <p className="jpass__error">{error}</p>}
        <button className="jpass__button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save to vault'}
        </button>
      </form>

      <section className="jpass-vault" aria-busy={loading}>
        <h2 className="jpass-vault__heading">Saved passwords</h2>
        {loading ? (
          <p className="jpass-vault__empty">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="jpass-vault__empty">No entries yet.</p>
        ) : (
          <ul className="jpass-vault__list">
            {entries.map((entry) => (
              <VaultEntryRow
                key={entry.id}
                entry={entry}
                busy={mutatingEntryId === entry.id}
                onUpdate={onUpdateEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </ul>
        )}
      </section>

      <button className="jpass__link" type="button" onClick={onLogout} disabled={saving}>
        Sign out
      </button>
    </main>
  )
}
