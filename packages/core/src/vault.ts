export interface VaultEntryInput {
  site: string
  username: string
  password: string
}

export interface VaultEntry extends VaultEntryInput {
  id: string
  createdAt: number
}

/** Raw Firestore entry before client-side decryption */
export interface StoredVaultEntry {
  id: string
  createdAt: number
  schemaVersion?: number
  payloadIv?: string
  payloadCipher?: string
  site?: string
  username?: string
  password?: string
}

export interface VaultMetaRecord {
  kdfSalt: string
  verifierIv: string
  verifierCipher: string
  encryptionVersion: number
}
