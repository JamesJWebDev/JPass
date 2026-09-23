export interface VaultEntryInput {
  site: string
  username: string
  password: string
}

export interface VaultEntry extends VaultEntryInput {
  id: string
  createdAt: number
}
