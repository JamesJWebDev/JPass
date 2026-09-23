import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ensureSodiumReady,
  type StoredVaultEntry,
  type VaultEntry,
  type VaultEntryInput,
  type VaultMetaRecord,
} from '@jpass/core'
import { Login, MasterPasswordGate, Vault } from '@jpass/ui'
import {
  decryptStoredEntry,
  encryptVaultEntry,
  prepareVaultMeta,
  unlockVaultKey,
} from './vaultCrypto'
import { getVaultKey, isVaultUnlocked, lockVault, setVaultKey } from './vaultSession'

interface SessionUser {
  uid: string
  email: string | null
}

interface VaultStatus {
  configured: boolean
  unlocked: boolean
}

function AuthGate() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null)
  const [vaultStatusLoading, setVaultStatusLoading] = useState(false)
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterError, setMasterError] = useState<string | null>(null)
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultSaving, setVaultSaving] = useState(false)
  const [mutatingEntryId, setMutatingEntryId] = useState<string | null>(null)
  const [vaultError, setVaultError] = useState<string | null>(null)

  const refreshVaultStatus = useCallback(() => {
    setVaultStatusLoading(true)
    chrome.runtime.sendMessage({ action: 'getVaultStatus' }, (response) => {
      setVaultStatusLoading(false)
      if (response?.success) {
        setVaultStatus({
          configured: Boolean(response.configured),
          unlocked: isVaultUnlocked(),
        })
      } else {
        setMasterError(response?.error ?? 'Could not load vault status')
      }
    })
  }, [])

  const loadVaultEntries = useCallback(() => {
    if (!isVaultUnlocked()) {
      return
    }

    setVaultLoading(true)
    setVaultError(null)

    chrome.runtime.sendMessage({ action: 'listVaultEntries' }, async (response) => {
      if (!response?.success) {
        setVaultLoading(false)
        setVaultError(response?.error ?? 'Could not load vault')
        return
      }

      try {
        const key = getVaultKey()
        const stored = (response.entries ?? []) as StoredVaultEntry[]
        const decrypted = await Promise.all(stored.map((entry) => decryptStoredEntry(key, entry)))
        setEntries(decrypted)
      } catch (err) {
        setVaultError(err instanceof Error ? err.message : 'Could not decrypt vault')
        setEntries([])
      } finally {
        setVaultLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    void ensureSodiumReady().catch((err) => {
      setMasterError(err instanceof Error ? err.message : 'Could not initialize encryption')
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
      refreshVaultStatus()
    } else {
      lockVault()
      setVaultStatus(null)
      setEntries([])
    }
  }, [user, refreshVaultStatus])

  useEffect(() => {
    if (vaultStatus?.configured && vaultStatus.unlocked) {
      loadVaultEntries()
    } else {
      setEntries([])
    }
  }, [vaultStatus, loadVaultEntries])

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

  async function handleSetupMaster(masterPassword: string) {
    setMasterLoading(true)
    setMasterError(null)

    try {
      const { meta, key } = await prepareVaultMeta(masterPassword)

      chrome.runtime.sendMessage({ action: 'saveVaultMeta', data: meta }, (response) => {
        setMasterLoading(false)
        if (response?.success) {
          setVaultKey(key)
          setVaultStatus({ configured: true, unlocked: true })
        } else {
          setMasterError(response?.error ?? 'Could not create vault')
        }
      })
    } catch (err) {
      setMasterLoading(false)
      setMasterError(err instanceof Error ? err.message : 'Could not create vault')
    }
  }

  function handleUnlockMaster(masterPassword: string) {
    setMasterLoading(true)
    setMasterError(null)

    chrome.runtime.sendMessage({ action: 'getVaultMeta' }, async (response) => {
      if (!response?.success || !response.meta) {
        setMasterLoading(false)
        setMasterError(response?.error ?? 'Vault metadata not found')
        return
      }

      try {
        const key = await unlockVaultKey(masterPassword, response.meta as VaultMetaRecord)
        setVaultKey(key)
        setVaultStatus({ configured: true, unlocked: true })
        setMasterLoading(false)
      } catch (err) {
        setMasterLoading(false)
        setMasterError(err instanceof Error ? err.message : 'Could not unlock vault')
      }
    })
  }

  async function handleSaveEntry(input: VaultEntryInput) {
    setVaultSaving(true)
    setVaultError(null)

    try {
      const key = getVaultKey()
      const document = await encryptVaultEntry(key, input)
      chrome.runtime.sendMessage({ action: 'saveVaultEntry', data: { document } }, (response) => {
        setVaultSaving(false)
        if (response?.success) {
          loadVaultEntries()
        } else {
          setVaultError(response?.error ?? 'Could not save entry')
        }
      })
    } catch (err) {
      setVaultSaving(false)
      setVaultError(err instanceof Error ? err.message : 'Could not save entry')
    }
  }

  async function handleUpdateEntry(id: string, input: VaultEntryInput) {
    setMutatingEntryId(id)
    setVaultError(null)

    try {
      const key = getVaultKey()
      const document = await encryptVaultEntry(key, input)
      chrome.runtime.sendMessage(
        {
          action: 'updateVaultEntry',
          data: { id, document, stripLegacyFields: true },
        },
        (response) => {
          setMutatingEntryId(null)
          if (response?.success) {
            loadVaultEntries()
          } else {
            setVaultError(response?.error ?? 'Could not update entry')
          }
        }
      )
    } catch (err) {
      setMutatingEntryId(null)
      setVaultError(err instanceof Error ? err.message : 'Could not update entry')
    }
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
    lockVault()
    chrome.runtime.sendMessage({ action: 'logoutUser' }, (response) => {
      if (response?.success) {
        setUser(null)
        setVaultStatus(null)
        setVaultError(null)
        setMasterError(null)
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

  if (!user) {
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

  if (vaultStatusLoading || !vaultStatus) {
    return (
      <main className="jpass">
        <header className="jpass__header">
          <span className="jpass__logo" aria-hidden="true">
            🔐
          </span>
          <h1 className="jpass__title">JPass</h1>
        </header>
        <p className="jpass__subtitle">Checking vault…</p>
      </main>
    )
  }

  if (!vaultStatus.configured) {
    return (
      <MasterPasswordGate
        mode="setup"
        error={masterError}
        loading={masterLoading}
        onSubmit={handleSetupMaster}
        onLogout={handleLogout}
      />
    )
  }

  if (!vaultStatus.unlocked) {
    return (
      <MasterPasswordGate
        mode="unlock"
        error={masterError}
        loading={masterLoading}
        onSubmit={handleUnlockMaster}
        onLogout={handleLogout}
      />
    )
  }

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

const container = document.getElementById('root')

if (container) {
  createRoot(container).render(
    <StrictMode>
      <AuthGate />
    </StrictMode>
  )
}
