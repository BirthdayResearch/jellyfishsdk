import { Bip32Options } from '@defichain/jellyfish-wallet-mnemonic'
import { ScryptStorage } from './scrypt-storage'
import * as bip32 from 'bip32'
import { Bip32Provider } from './encrypted-mnemonic-provider'

export class EncryptedBip32Provider implements Bip32Provider {
  /**
   * @param {ScryptStorage} scryptStorage to store encrypted mnemonic seed
   * @param {Bip32Options} prefixOptions to reconstruct Bip32Interface when hdnode unlocked with passphrase
   * @param {Buffer} seedHash to verify new node derivation is using a valid seed
   */
  constructor (
    private readonly collectPassphrase: () => Promise<string>,
    private readonly scryptStorage: ScryptStorage,
    private readonly options: Bip32Options
  ) {}

  async get (): Promise<bip32.BIP32Interface> {
    const passphrase = await this.collectPassphrase()
    const seed = await this.scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No encrypted seed found in storage')
    }
    return bip32.fromSeed(seed, this.options)
  }
}
