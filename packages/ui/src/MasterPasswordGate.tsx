import { useState, type FormEvent } from 'react'
import './app.css'
import './login.css'

export interface MasterPasswordGateProps {
  mode: 'setup' | 'unlock'
  error: string | null
  loading: boolean
  onSubmit: (masterPassword: string) => void
  onLogout: () => void
}

export function MasterPasswordGate({
  mode,
  error,
  loading,
  onSubmit,
  onLogout,
}: MasterPasswordGateProps) {
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    if (mode === 'setup' && masterPassword !== confirmPassword) {
      setLocalError('Master passwords do not match')
      return
    }

    if (masterPassword.length < 8) {
      setLocalError('Master password must be at least 8 characters')
      return
    }

    onSubmit(masterPassword)
  }

  const displayError = localError ?? error

  return (
    <main className="jpass">
      <header className="jpass__header">
        <span className="jpass__logo" aria-hidden="true">
          🔐
        </span>
        <h1 className="jpass__title">JPass</h1>
      </header>
      <p className="jpass__subtitle">
        {mode === 'setup'
          ? 'Create a master password to encrypt your vault'
          : 'Unlock your vault with your master password'}
      </p>
      <form className="jpass__form" onSubmit={handleSubmit}>
        <input
          className="jpass__input"
          type="password"
          placeholder="Master password"
          value={masterPassword}
          onChange={(event) => setMasterPassword(event.target.value)}
          minLength={8}
          required
          autoFocus
          disabled={loading}
        />
        {mode === 'setup' ? (
          <input
            className="jpass__input"
            type="password"
            placeholder="Confirm master password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
        ) : null}
        {displayError && <p className="jpass__error">{displayError}</p>}
        <button className="jpass__button" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'setup' ? 'Create vault' : 'Unlock vault'}
        </button>
      </form>
      <p className="jpass__subtitle">
        Your master password never leaves this device. We cannot recover it if you forget it.
      </p>
      <button className="jpass__link" type="button" onClick={onLogout} disabled={loading}>
        Sign out
      </button>
    </main>
  )
}
