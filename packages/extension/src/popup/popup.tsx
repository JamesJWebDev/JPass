import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { VaultEntry, VaultEntryInput } from '@jpass/core'
import { Login, Vault } from '@jpass/ui'

interface SessionUser {
  uid: string
  email: string | null
}

function AuthGate() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultSaving, setVaultSaving] = useState(false)
  const [mutatingEntryId, setMutatingEntryId] = useState<string | null>(null)
  const [vaultError, setVaultError] = useState<string | null>(null)

  const loadVaultEntries = useCallback(() => {
    setVaultLoading(true)
    setVaultError(null)
    chrome.runtime.sendMessage({ action: 'listVaultEntries' }, (response) => {
      setVaultLoading(false)
      if (response?.success) {
        setEntries(response.entries ?? [])
      } else {
        setVaultError(response?.error ?? 'Could not load vault')
      }
    })
  }, [])

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getSession' }, (response) => {
      setBootstrapping(false)
      if (response?.success && response.uid) {
        setUser({ uid: response.uid, email: response.email ?? null })
      }
    })
  }, [])

  useEffect(() => {
    if (user) {
      loadVaultEntries()
    } else {
      setEntries([])
    }
  }, [user, loadVaultEntries])

  function handleSubmit(email: string, password: string) {
    setError(null)
    setLoading(true)
    const action = mode === 'login' ? 'loginUser' : 'registerUser'
    chrome.runtime.sendMessage({ action, data: { email, password } }, (response) => {
      setLoading(false)
      if (response?.success) {
        setUser({ uid: response.uid, email: response.email ?? email })
      } else {
        setError(response?.error ?? 'Authentication failed')
      }
    })
  }

  function handleSaveEntry(input: VaultEntryInput) {
    setVaultSaving(true)
    setVaultError(null)
    chrome.runtime.sendMessage({ action: 'saveVaultEntry', data: input }, (response) => {
      setVaultSaving(false)
      if (response?.success) {
        loadVaultEntries()
      } else {
        setVaultError(response?.error ?? 'Could not save entry')
      }
    })
  }

  function handleUpdateEntry(id: string, input: VaultEntryInput) {
    setMutatingEntryId(id)
    setVaultError(null)
    chrome.runtime.sendMessage({ action: 'updateVaultEntry', data: { id, ...input } }, (response) => {
      setMutatingEntryId(null)
      if (response?.success) {
        loadVaultEntries()
      } else {
        setVaultError(response?.error ?? 'Could not update entry')
      }
    })
  }

  function handleDeleteEntry(id: string) {
    if (!window.confirm('Delete this vault entry?')) {
      return
    }
    setMutatingEntryId(id)
    setVaultError(null)
    chrome.runtime.sendMessage({ action: 'deleteVaultEntry', data: { id } }, (response) => {
      setMutatingEntryId(null)
      if (response?.success) {
        loadVaultEntries()
      } else {
        setVaultError(response?.error ?? 'Could not delete entry')
      }
    })
  }

  function handleLogout() {
    chrome.runtime.sendMessage({ action: 'logoutUser' }, (response) => {
      if (response?.success) {
        setUser(null)
        setVaultError(null)
      }
    })
  }

  if (bootstrapping) {
    return (
      <main className="jpass">
        <header className="jpass__header">
          <span className="jpass__logo" aria-hidden="true">
            🔐
          </span>
          <h1 className="jpass__title">JPass</h1>
        </header>
        <p className="jpass__subtitle">Loading…</p>
      </main>
    )
  }

  if (user) {
    return (
      <Vault
        userEmail={user.email}
        entries={entries}
        loading={vaultLoading}
        saving={vaultSaving}
        mutatingEntryId={mutatingEntryId}
        error={vaultError}
        onSaveEntry={handleSaveEntry}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <Login
      mode={mode}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      onToggleMode={() => setMode(mode === 'login' ? 'register' : 'login')}
    />
  )
}

const container = document.getElementById('root')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <AuthGate />
    </StrictMode>
  )
}
