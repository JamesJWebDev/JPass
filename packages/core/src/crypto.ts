export const VAULT_VERIFIER_PLAINTEXT = 'jpass-vault-v1'
export const VAULT_SCHEMA_VERSION = 2
export const PBKDF2_ITERATIONS = 310_000
export const KDF_SALT_BYTES = 16

export type VaultKey = CryptoKey

export interface EncryptedBlob {
  iv: string
  ciphertext: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function generateSaltBase64(): string {
  const salt = crypto.getRandomValues(new Uint8Array(KDF_SALT_BYTES))
  return bytesToBase64(salt)
}

export async function ensureSodiumReady(): Promise<void> {
  // Legacy no-op: kept so popup startup code does not break after Web Crypto migration.
}

export async function deriveVaultKey(masterPassword: string, saltBase64: string): Promise<VaultKey> {
  if (!masterPassword) {
    throw new Error('Master password is required')
  }

  const salt = base64ToBytes(saltBase64)
  if (salt.length !== KDF_SALT_BYTES) {
    throw new Error('Invalid vault salt')
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const saltBuffer = new Uint8Array(salt)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptString(key: VaultKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptString(
  key: VaultKey,
  ivBase64: string,
  ciphertextBase64: string
): Promise<string> {
  const iv = new Uint8Array(base64ToBytes(ivBase64))
  const ciphertext = new Uint8Array(base64ToBytes(ciphertextBase64))
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuffer)
}

export async function createVerifierBlob(key: VaultKey): Promise<EncryptedBlob> {
  return encryptString(key, VAULT_VERIFIER_PLAINTEXT)
}

export async function verifyVaultKey(key: VaultKey, verifier: EncryptedBlob): Promise<boolean> {
  try {
    const plain = await decryptString(key, verifier.iv, verifier.ciphertext)
    return plain === VAULT_VERIFIER_PLAINTEXT
  } catch {
    return false
  }
}
