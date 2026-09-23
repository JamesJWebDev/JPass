import { getFirebaseAuth } from './firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'

export function requireAuthUser(): Promise<User> {
  const auth = getFirebaseAuth()
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser)
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      if (user) {
        resolve(user)
      } else {
        reject(new Error('Not signed in'))
      }
    })
  })
}
