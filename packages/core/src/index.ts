export type {
  StoredVaultEntry,
  VaultEntry,
  VaultEntryInput,
  VaultMetaRecord,
} from './vault'
export {
  VAULT_SCHEMA_VERSION,
  VAULT_VERIFIER_PLAINTEXT,
  createVerifierBlob,
  decryptString,
  deriveVaultKey,
  encryptString,
  ensureSodiumReady,
  generateSaltBase64,
  verifyVaultKey,
} from './crypto'
export type { EncryptedBlob, VaultKey } from './crypto'
