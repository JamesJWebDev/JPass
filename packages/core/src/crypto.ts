import _sodium from 'libsodium-wrappers'

export const VAULT_VERIFIER_PLAINTEXT = 'jpass-vault-v1'
export const VAULT_SCHEMA_VERSION = 2

export type VaultKey = Uint8Array

export interface EncryptedBlob {
  iv: string
  ciphertext: string
}

let sodiumReady: Promise<typeof _sodium> | undefined

function getSodium(): Promise<typeof _sodium> {
  if (!sodiumReady) {
    sodiumReady = _sodium.ready.then(() => _sodium)
  }
  return sodiumReady
}

export async function generateSaltBase64(): Promise<string> {
  const sodium = await getSodium()
  return sodium.to_base64(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES))
}

export async function deriveVaultKey(masterPassword: string, saltBase64: string): Promise<VaultKey> {
  const sodium = await getSodium()
  const salt = sodium.from_base64(saltBase64)

  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    masterPassword,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )
}

export async function encryptString(key: VaultKey, plaintext: string): Promise<EncryptedBlob> {
  const sodium = await getSodium()
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key)

  return {
    iv: sodium.to_base64(nonce),
    ciphertext: sodium.to_base64(ciphertext),
  }
}

export async function decryptString(
  key: VaultKey,
  ivBase64: string,
  ciphertextBase64: string
): Promise<string> {
  const sodium = await getSodium()
  const nonce = sodium.from_base64(ivBase64)
  const ciphertext = sodium.from_base64(ciphertextBase64)
  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, key)
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
