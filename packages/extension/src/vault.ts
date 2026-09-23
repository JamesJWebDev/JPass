import type { StoredVaultEntry } from '@jpass/core'
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

function entriesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'entries')
}

function entryDocument(uid: string, entryId: string) {
  return doc(getFirestore(), 'users', uid, 'entries', entryId)
}

export async function saveVaultEntry(
  uid: string,
  data: Record<string, unknown>
): Promise<string> {
  const docRef = await addDoc(entriesCollection(uid), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateVaultEntry(
  uid: string,
  entryId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(entryDocument(uid, entryId), data)
}

export async function deleteVaultEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(entryDocument(uid, entryId))
}

export async function listVaultEntries(uid: string): Promise<StoredVaultEntry[]> {
  const snapshot = await getDocs(
    query(entriesCollection(uid), orderBy('createdAt', 'desc'))
  )

  return snapshot.docs.map((entryDoc) => {
    const data = entryDoc.data()
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()

    return {
      id: entryDoc.id,
      createdAt,
      schemaVersion: data.schemaVersion as number | undefined,
      payloadIv: data.payloadIv as string | undefined,
      payloadCipher: data.payloadCipher as string | undefined,
      site: data.site as string | undefined,
      username: data.username as string | undefined,
      password: data.password as string | undefined,
    }
  })
}

export { deleteField }
