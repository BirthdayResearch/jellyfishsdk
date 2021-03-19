export interface HDNode {
  publicKey: Buffer
  privateKey?: Buffer
  address: string

  // TODO(fuxingloh): convert to all Promise based actions

  neuter (): HDNode

  isNeuter (): boolean

  derive (index: number): HDNode

  deriveHardened (index: number): HDNode

  derivePath (path: string): HDNode

  toWIF (): string

  // TODO(fuxingloh): chainCode
  // TODO(fuxingloh): depth
  // TODO(fuxingloh): index

  // TODO(fuxingloh): sign
  // TODO(fuxingloh): verify

  // TODO(fuxingloh): fingerprint
  // TODO(fuxingloh): parentFingerprint
  // TODO(fuxingloh): toBase58
}
