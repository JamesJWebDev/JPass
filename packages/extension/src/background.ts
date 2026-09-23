import { requireAuthUser } from './auth'
import { getFirebaseAuth } from './firebase'
import {
  getVaultStatusForUser,
  setupVaultMaster,
  unlockVault,
} from './vaultMeta'
import { lockVault } from './vaultSession'
import { deleteVaultEntry, listVaultEntries, saveVaultEntry, updateVaultEntry } from './vault'
import type { VaultEntryInput } from '@jpass/core'
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
    lockVault()
    signOut(getFirebaseAuth())
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'lockVault') {
    lockVault()
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'getVaultStatus') {
    requireAuthUser()
      .then((user) => getVaultStatusForUser(user.uid))
      .then((status) => sendResponse({ success: true, ...status }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'setupVaultMaster') {
    const { masterPassword } = request.data as { masterPassword: string }
    requireAuthUser()
      .then((user) => setupVaultMaster(user.uid, masterPassword))
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'unlockVault') {
    const { masterPassword } = request.data as { masterPassword: string }
    requireAuthUser()
      .then((user) => unlockVault(user.uid, masterPassword))
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

  if (request.action === 'listVaultEntries') {
    requireAuthUser()
      .then((user) => listVaultEntries(user.uid))
      .then((entries) => sendResponse({ success: true, entries }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'saveVaultEntry') {
    const input = request.data as VaultEntryInput
    requireAuthUser()
      .then((user) => saveVaultEntry(user.uid, input))
      .then((id) => sendResponse({ success: true, id }))
      .catch((error) => sendResponse({ success: false, error: error.message }))

    return true
  }

  if (request.action === 'updateVaultEntry') {
    const { id, ...input } = request.data as VaultEntryInput & { id: string }
    requireAuthUser()
      .then((user) => updateVaultEntry(user.uid, id, input))
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
