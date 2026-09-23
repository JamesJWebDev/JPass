import type {
  StoredVaultEntry,
  VaultEntry,
  VaultEntryInput,
  VaultMetaRecord,
  VaultKey,
} from '@jpass/core'
import {
  VAULT_SCHEMA_VERSION,
  createVerifierBlob,
  decryptString,
  deriveVaultKey,
  encryptString,
  generateSaltBase64,
  verifyVaultKey,
} from '@jpass/core'

export async function prepareVaultMeta(
  masterPassword: string
): Promise<{ meta: VaultMetaRecord; key: VaultKey }> {
  const kdfSalt = generateSaltBase64()
  const key = await deriveVaultKey(masterPassword, kdfSalt)
  const verifier = await createVerifierBlob(key)

  return {
    key,
    meta: {
      kdfSalt,
      verifierIv: verifier.iv,
      verifierCipher: verifier.ciphertext,
      encryptionVersion: 2,
    },
  }
}

export async function unlockVaultKey(
  masterPassword: string,
  meta: VaultMetaRecord
): Promise<VaultKey> {
  if (meta.encryptionVersion !== 2) {
    throw new Error(
      'This vault was created with an older encryption format. Set a new master password to re-create the vault (existing encrypted entries may need to be re-added).'
    )
  }

  const key = await deriveVaultKey(masterPassword, meta.kdfSalt)
  const valid = await verifyVaultKey(key, {
    iv: meta.verifierIv,
    ciphertext: meta.verifierCipher,
  })

  if (!valid) {
    throw new Error('Incorrect master password')
  }

  return key
}

export async function encryptVaultEntry(
  key: VaultKey,
  input: VaultEntryInput
): Promise<Record<string, unknown>> {
  const payload = JSON.stringify({
    site: input.site.trim(),
    username: input.username.trim(),
    password: input.password,
  })
  const encrypted = await encryptString(key, payload)

  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    payloadIv: encrypted.iv,
    payloadCipher: encrypted.ciphertext,
  }
}

export async function decryptStoredEntry(
  key: VaultKey,
  stored: StoredVaultEntry
): Promise<VaultEntry> {
  if (stored.schemaVersion === VAULT_SCHEMA_VERSION) {
    if (!stored.payloadIv || !stored.payloadCipher) {
      throw new Error('Encrypted entry is missing payload')
    }
    const plain = await decryptString(key, stored.payloadIv, stored.payloadCipher)
    const parsed = JSON.parse(plain) as VaultEntryInput
    return {
      id: stored.id,
      site: parsed.site,
      username: parsed.username,
      password: parsed.password,
      createdAt: stored.createdAt,
    }
  }

  return {
    id: stored.id,
    site: stored.site ?? '',
    username: stored.username ?? '',
    password: stored.password ?? '',
    createdAt: stored.createdAt,
  }
}
