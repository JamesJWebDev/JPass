import { requireAuthUser } from './auth'
import { getFirebaseAuth } from './firebase'
import { getVaultMeta, isVaultConfigured, saveVaultMeta } from './vaultMeta'
import {
  deleteVaultEntry,
  listVaultEntries,
  saveVaultEntry,
  updateVaultEntry,
  deleteField,
} from './vault'
import type { VaultMetaRecord } from '@jpass/core'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

chrome.runtime.onInstalled.addListener(() => {
  console.log('JPass extension installed')
})

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'registerUser' || request.action === 'loginUser') {
    const { email, password } = request.data
    const auth = getFirebaseAuth()
    const operation =
      request.action === 'registerUser'
        ? createUserWithEmailAndPassword(auth, email, password)
        : signInWithEmailAndPassword(auth, email, password)

    operation
      .then((credential) =>
        sendResponse({ success: true, uid: credential.user.uid, email: credential.user.email })
      )
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'logoutUser') {
    signOut(getFirebaseAuth())
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'getSession') {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      if (user) {
        sendResponse({ success: true, uid: user.uid, email: user.email })
      } else {
        sendResponse({ success: true, uid: null, email: null })
      }
    })

    return true
  }

  if (request.action === 'getVaultStatus') {
    requireAuthUser()
      .then((user) => isVaultConfigured(user.uid))
      .then((configured) => sendResponse({ success: true, configured }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'getVaultMeta') {
    requireAuthUser()
      .then((user) => getVaultMeta(user.uid))
      .then((meta) => sendResponse({ success: true, meta }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'saveVaultMeta') {
    const meta = request.data as VaultMetaRecord
    requireAuthUser()
      .then((user) => saveVaultMeta(user.uid, meta))
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'listVaultEntries') {
    requireAuthUser()
      .then((user) => listVaultEntries(user.uid))
      .then((entries) => sendResponse({ success: true, entries }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'saveVaultEntry') {
    const { document } = request.data as { document: Record<string, unknown> }
    requireAuthUser()
      .then((user) => saveVaultEntry(user.uid, document))
      .then((id) => sendResponse({ success: true, id }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'updateVaultEntry') {
    const { id, document, stripLegacyFields } = request.data as {
      id: string
      document: Record<string, unknown>
      stripLegacyFields?: boolean
    }
    requireAuthUser()
      .then((user) => {
        const patch = stripLegacyFields
          ? {
              ...document,
              site: deleteField(),
              username: deleteField(),
              password: deleteField(),
            }
          : document
        return updateVaultEntry(user.uid, id, patch)
      })
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'deleteVaultEntry') {
    const { id } = request.data as { id: string }
    requireAuthUser()
      .then((user) => deleteVaultEntry(user.uid, id))
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  return false
})
