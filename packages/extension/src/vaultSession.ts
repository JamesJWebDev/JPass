import type { VaultKey } from '@jpass/core'

let vaultKey: VaultKey | null = null

export function isVaultUnlocked(): boolean {
  return vaultKey !== null
}

export function getVaultKey(): VaultKey {
  if (!vaultKey) {
    throw new Error('Vault is locked')
  }
  return vaultKey
}

export function setVaultKey(key: VaultKey): void {
  vaultKey = key
}

export function lockVault(): void {
  vaultKey = null
}
