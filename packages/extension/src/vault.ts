import type { VaultEntry, VaultEntryInput } from '@jpass/core'
import { decryptString, encryptString, VAULT_SCHEMA_VERSION } from '@jpass/core'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { getFirestore } from './firebase'
import { assertVaultUnlocked, isVaultConfigured } from './vaultMeta'
import { getVaultKey, isVaultUnlocked } from './vaultSession'

function entriesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'entries')
}

function entryDocument(uid: string, entryId: string) {
  return doc(getFirestore(), 'users', uid, 'entries', entryId)
}

async function requireEncryptionKey(uid: string) {
  const configured = await isVaultConfigured(uid)
  if (!configured) {
    return null
  }
  await assertVaultUnlocked(uid)
  return getVaultKey()
}

async function buildEncryptedDocument(uid: string, input: VaultEntryInput) {
  const key = await requireEncryptionKey(uid)
  if (!key) {
    return {
      site: input.site.trim(),
      username: input.username.trim(),
      password: input.password,
      createdAt: serverTimestamp(),
    }
  }

  const payload = JSON.stringify({
    site: input.site.trim(),
    username: input.username.trim(),
    password: input.password,
  })
  const encrypted = await encryptString(key, payload)

  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    payloadIv: encrypted.iv,
    payloadCipher: encrypted.ciphertext,
    createdAt: serverTimestamp(),
  }
}

async function documentToVaultEntry(
  uid: string,
  id: string,
  data: Record<string, unknown>,
  createdAt: number
): Promise<VaultEntry> {
  if (data.schemaVersion === VAULT_SCHEMA_VERSION) {
    const configured = await isVaultConfigured(uid)
    if (!configured || !isVaultUnlocked()) {
      throw new Error('Vault is locked')
    }
    const key = getVaultKey()
    const plain = await decryptString(
      key,
      data.payloadIv as string,
      data.payloadCipher as string
    )
    const parsed = JSON.parse(plain) as VaultEntryInput
    return {
      id,
      site: parsed.site,
      username: parsed.username,
      password: parsed.password,
      createdAt,
    }
  }

  return {
    id,
    site: data.site as string,
    username: data.username as string,
    password: data.password as string,
    createdAt,
  }
}

export async function saveVaultEntry(uid: string, input: VaultEntryInput): Promise<string> {
  const docRef = await addDoc(entriesCollection(uid), await buildEncryptedDocument(uid, input))
  return docRef.id
}

export async function updateVaultEntry(
  uid: string,
  entryId: string,
  input: VaultEntryInput
): Promise<void> {
  const key = await requireEncryptionKey(uid)
  if (key) {
    const payload = JSON.stringify({
      site: input.site.trim(),
      username: input.username.trim(),
      password: input.password,
    })
    const encrypted = await encryptString(key, payload)
    await updateDoc(entryDocument(uid, entryId), {
      schemaVersion: VAULT_SCHEMA_VERSION,
      payloadIv: encrypted.iv,
      payloadCipher: encrypted.ciphertext,
      site: deleteField(),
      username: deleteField(),
      password: deleteField(),
    })
    return
  }

  await updateDoc(entryDocument(uid, entryId), {
    site: input.site.trim(),
    username: input.username.trim(),
    password: input.password,
  })
}

export async function deleteVaultEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(entryDocument(uid, entryId))
}

export async function listVaultEntries(uid: string): Promise<VaultEntry[]> {
  const snapshot = await getDocs(
    query(entriesCollection(uid), orderBy('createdAt', 'desc'))
  )

  const entries: VaultEntry[] = []
  for (const entryDoc of snapshot.docs) {
    const data = entryDoc.data()
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()
    entries.push(await documentToVaultEntry(uid, entryDoc.id, data, createdAt))
  }
  return entries
}
