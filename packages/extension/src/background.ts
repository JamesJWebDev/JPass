import { getFirebaseAuth } from './firebase'
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

  return false
})
