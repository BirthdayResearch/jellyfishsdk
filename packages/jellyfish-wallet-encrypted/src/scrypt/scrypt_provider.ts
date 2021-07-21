export interface ScryptProvider {
  passphraseToKey: (nfcUtf8: string, salt: Buffer, desiredKeyLen: number) => Buffer
}
