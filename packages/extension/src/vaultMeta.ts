import type { VaultKey } from '@jpass/core'
import {
  createVerifierBlob,
  deriveVaultKey,
  generateSaltBase64,
  verifyVaultKey,
} from '@jpass/core'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestore } from './firebase'
import { getVaultKey, isVaultUnlocked, setVaultKey } from './vaultSession'

export interface VaultMeta {
  kdfSalt: string
  verifierIv: string
  verifierCipher: string
  encryptionVersion: number
}

function metaDocument(uid: string) {
  return doc(getFirestore(), 'users', uid, 'vault', 'meta')
}

export async function getVaultMeta(uid: string): Promise<VaultMeta | null> {
  const snapshot = await getDoc(metaDocument(uid))
  if (!snapshot.exists()) {
    return null
  }
  const data = snapshot.data()
  return {
    kdfSalt: data.kdfSalt as string,
    verifierIv: data.verifierIv as string,
    verifierCipher: data.verifierCipher as string,
    encryptionVersion: data.encryptionVersion as number,
  }
}

export async function isVaultConfigured(uid: string): Promise<boolean> {
  const meta = await getVaultMeta(uid)
  return meta !== null
}

export async function setupVaultMaster(uid: string, masterPassword: string): Promise<void> {
  const existing = await getVaultMeta(uid)
  if (existing) {
    throw new Error('Vault master password is already configured')
  }

  const kdfSalt = await generateSaltBase64()
  const key = await deriveVaultKey(masterPassword, kdfSalt)
  const verifier = await createVerifierBlob(key)

  await setDoc(metaDocument(uid), {
    kdfSalt,
    verifierIv: verifier.iv,
    verifierCipher: verifier.ciphertext,
    encryptionVersion: 1,
  })

  setVaultKey(key)
}

export async function unlockVault(uid: string, masterPassword: string): Promise<void> {
  const meta = await getVaultMeta(uid)
  if (!meta) {
    throw new Error('Vault master password is not configured')
  }

  const key = await deriveVaultKey(masterPassword, meta.kdfSalt)
  const valid = await verifyVaultKey(key, {
    iv: meta.verifierIv,
    ciphertext: meta.verifierCipher,
  })

  if (!valid) {
    throw new Error('Incorrect master password')
  }

  setVaultKey(key)
}

export async function getVaultStatusForUser(uid: string): Promise<{ configured: boolean; unlocked: boolean }> {
  return {
    configured: await isVaultConfigured(uid),
    unlocked: isVaultUnlocked(),
  }
}

export async function assertVaultUnlocked(uid: string): Promise<VaultKey> {
  const configured = await isVaultConfigured(uid)
  if (configured && !isVaultUnlocked()) {
    throw new Error('Vault is locked')
  }
  return getVaultKey()
}
