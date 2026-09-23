import type { VaultEntry, VaultEntryInput } from '@jpass/core'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { getFirestore } from './firebase'

function entriesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'entries')
}

function entryDocument(uid: string, entryId: string) {
  return doc(getFirestore(), 'users', uid, 'entries', entryId)
}

export async function saveVaultEntry(uid: string, input: VaultEntryInput): Promise<string> {
  const docRef = await addDoc(entriesCollection(uid), {
    site: input.site.trim(),
    username: input.username.trim(),
    password: input.password,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateVaultEntry(
  uid: string,
  entryId: string,
  input: VaultEntryInput
): Promise<void> {
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

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()

    return {
      id: doc.id,
      site: data.site as string,
      username: data.username as string,
      password: data.password as string,
      createdAt,
    }
  })
}
