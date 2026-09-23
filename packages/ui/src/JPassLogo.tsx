import logoUrl from './assets/jpass-logo.png'
import './app.css'

export function JPassLogo() {
  return (
    <img className="jpass__logo" src={logoUrl} alt="" width={36} height={36} decoding="async" />
  )
}
