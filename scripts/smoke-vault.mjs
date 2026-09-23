import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile() {
  const env = {}
  try {
    const text = readFileSync(resolve(root, '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  } catch {
    console.error('Missing .env — copy .env.example and set VITE_FIREBASE_* values.')
    process.exit(1)
  }
  return env
}

const env = loadEnvFile()
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.appId) {
  console.error('VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID must be set in .env')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const email = `jpass-smoke-${Date.now()}@jpass-smoke.test`
const password = `Smoke-${Date.now()}-Aa1`

console.log('Creating temporary test user…')
const { user } = await createUserWithEmailAndPassword(auth, email, password)
const uid = user.uid

console.log('Saving vault entry…')
await addDoc(collection(db, 'users', uid, 'entries'), {
  site: 'Smoke Test Site',
  username: 'smoke-user',
  password: 'smoke-secret',
  createdAt: serverTimestamp(),
})

console.log('Listing vault entries…')
const snapshot = await getDocs(
  query(collection(db, 'users', uid, 'entries'), orderBy('createdAt', 'desc'))
)

if (snapshot.empty) {
  console.error('FAIL: no entries returned after save')
  process.exit(1)
}

const entry = snapshot.docs[0].data()
if (entry.site !== 'Smoke Test Site' || entry.password !== 'smoke-secret') {
  console.error('FAIL: entry data mismatch', entry)
  process.exit(1)
}

await signOut(auth)
console.log('OK: Firestore vault save/list works with deployed rules.')
console.log(`(Test user ${email} was created; delete in Firebase Auth console if desired.)`)
