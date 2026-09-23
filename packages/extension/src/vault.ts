import type { VaultEntry, VaultEntryInput } from '@jpass/core'
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirestore } from './firebase'

function entriesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'entries')
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
