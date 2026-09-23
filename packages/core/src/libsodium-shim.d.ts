declare module 'libsodium-wrappers' {
  const sodium: {
    ready: Promise<void>
    crypto_pwhash_SALTBYTES: number
    crypto_secretbox_KEYBYTES: number
    crypto_secretbox_NONCEBYTES: number
    crypto_pwhash_OPSLIMIT_MODERATE: number
    crypto_pwhash_MEMLIMIT_MODERATE: number
    crypto_pwhash_ALG_ARGON2ID13: number
    randombytes_buf(length: number): Uint8Array
    to_base64(input: Uint8Array): string
    from_base64(input: string): Uint8Array
    crypto_pwhash(
      keyLength: number,
      password: string,
      salt: Uint8Array,
      opsLimit: number,
      memLimit: number,
      algorithm: number
    ): Uint8Array
    crypto_secretbox_easy(message: string, nonce: Uint8Array, key: Uint8Array): Uint8Array
    crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): string
  }
  export default sodium
}
