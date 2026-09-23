import { useState } from 'react'
import { JPassLogo } from './JPassLogo'
import './app.css'
import './login.css'

export interface LoginProps {
  mode: 'login' | 'register'
  error: string | null
  loading: boolean
  onSubmit: (email: string, password: string) => void
  onToggleMode: () => void
}

export function Login({ mode, error, loading, onSubmit, onToggleMode }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <main className="jpass">
      <header className="jpass__header">
        <JPassLogo />
        <h1 className="jpass__title">JPass</h1>
      </header>
      <p className="jpass__subtitle">
        {mode === 'login' ? 'Sign in to your vault' : 'Create your JPass account'}
      </p>
      <form
        className="jpass__form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(email, password)
        }}
      >
        <input
          className="jpass__input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
          required
          disabled={loading}
        />
        <input
          className="jpass__input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
          disabled={loading}
        />
        {error && <p className="jpass__error">{error}</p>}
        <button className="jpass__button" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button className="jpass__link" type="button" onClick={onToggleMode} disabled={loading}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
      </button>
    </main>
  )
}
