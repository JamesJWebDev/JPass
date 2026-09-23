import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Login } from '@jpass/ui'

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

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getSession' }, (response) => {
      setBootstrapping(false)
      if (response?.success && response.uid) {
        setUser({ uid: response.uid, email: response.email ?? null })
      }
    })
  }, [])

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

  function handleLogout() {
    chrome.runtime.sendMessage({ action: 'logoutUser' }, (response) => {
      if (response?.success) {
        setUser(null)
      }
    })
  }

  if (bootstrapping) {
    return (
      <main className="jpass">
        <header className="jpass__header">
          <span className="jpass__logo" aria-hidden="true">🔐</span>
          <h1 className="jpass__title">JPass</h1>
        </header>
        <p className="jpass__subtitle">Loading…</p>
      </main>
    )
  }

  if (user) {
    return (
      <main className="jpass">
        <header className="jpass__header">
          <span className="jpass__logo" aria-hidden="true">🔐</span>
          <h1 className="jpass__title">JPass</h1>
        </header>
        <p className="jpass__subtitle">Signed in as {user.email}</p>
        <button className="jpass__button" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </main>
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
