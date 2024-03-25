import { ApiClient } from '..'
import { wallet } from '../../src'

/**
 * Misc RPCs for DeFi Blockchain
 */
export class Misc {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * To dynamically change the time for testing
   *
   * @param {number} ts Unix epoch in seconds
   * @return Promise<void>
   */
  async setMockTime (ts: number): Promise<void> {
    const timestamp = ts.toString().length === 13 ? Math.floor(ts / 1e3) : ts
    return await this.client.call('setmocktime', [timestamp], 'number')
  }

  /**
   * Verify a signed message
   *
   * @param {string} address DeFi address to use for this signature
   * @param {string} signature Base 63 encoded signature
   * @param {string} message The message that was signed
   * @return Promise<boolean> Is valid signature of the provided address
   */
  async verifyMessage (address: string, signature: string, message: string): Promise<boolean> {
    return await this.client.call('verifymessage', [address, signature, message], 'number')
  }

  /**
   * Sign a message with the private key of an address
   *
   * @param {string} privkey The private key to sign the message with
   * @param {string} message The message to create a signature of
   * @return Promise<string> The signature of the message encoded in base 64
   */
  async signMessageWithPrivKey (privkey: string, message: string): Promise<string> {
    return await this.client.call('signmessagewithprivkey', [privkey, message], 'number')
  }

  /**
   * Creates a multi-signature address with n signature of m keys required.
   * It returns a json object with the address and redeemScript.
   *
   * @param {number} nRequired The number of required signatures out of the n keys.
   * @param {string[]} keys array of hex-encoded public keys.
   * @param {wallet.AddressType} [addressType=wallet.AddressType.LEGACY] the address type to use.
   *  Options are wallet.AddressType.LEGACY, wallet.AddressType.P2SHSEGWIT, and wallet.AddressType.BECH32.
   * @return Promise<MultiSigAddress> The signature of the message encoded in base 64
   */
  async createMultiSig (nRequired: number, keys: string[], addressType: wallet.AddressType = wallet.AddressType.LEGACY): Promise<MultiSigAddress> {
    return await this.client.call('createmultisig', [nRequired, keys, addressType], 'number')
  }

  /**
   * Derives one or more addresses corresponding to an output descriptor.
   *
   * @param {string} descriptor The descriptor.
   * @param {number[]} range If a ranged descriptor is used, this specifies the end or the range (in [begin,end] notation) to derive.
   * @return Promise<string[]> the derived addresses
   */
  async deriveAddresses (descriptor: string, range?: number[]): Promise<string[]> {
    return await this.client.call('deriveaddresses', [descriptor, range].filter(x => x !== undefined), 'number')
  }
}

export interface MultiSigAddress {
  address: string
  redeemScript: string
}
