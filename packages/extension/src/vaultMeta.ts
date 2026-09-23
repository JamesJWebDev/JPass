import type { VaultMetaRecord } from '@jpass/core'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestore } from './firebase'

function metaDocument(uid: string) {
  return doc(getFirestore(), 'users', uid, 'vault', 'meta')
}

export async function getVaultMeta(uid: string): Promise<VaultMetaRecord | null> {
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

export async function saveVaultMeta(uid: string, meta: VaultMetaRecord): Promise<void> {
  const existing = await getVaultMeta(uid)
  if (existing) {
    throw new Error('Vault master password is already configured')
  }
  await setDoc(metaDocument(uid), meta)
}

export async function isVaultConfigured(uid: string): Promise<boolean> {
  return (await getVaultMeta(uid)) !== null
}
