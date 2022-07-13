import { payments, Payment, Psbt, Network } from 'bitcoinjs-lib'
import { ECPairFactory, ECPairInterface } from 'ecpair'
import { ECC } from '@defichain/jellyfish-crypto'

export interface ECPairOptions {
  compressed?: boolean
  network?: Network
  rng?: (arg0: number) => Buffer
}

export function getECPair (privKey: Buffer, options?: ECPairOptions): ECPairInterface {
  return ECPairFactory(ECC).fromPrivateKey(privKey, options)
}

export type BitcoinJsLibNetwork = Network

export const BitcoinJsLib = {
  /**
   * @param {Buffer} pubKey to get P2WPKH payment details
   * @param {Network} network specified
   * @return {Payment}
   */
  getP2WPKH (pubKey: Buffer, network: Network): Payment {
    return payments.p2wpkh({
      pubkey: pubKey,
      network: network
    })
  },

  /**
   * @param {Network} network specified
   * @return {Psbt} Partially Signed Bitcoin Transaction
   */
  psbt (network: Network): Psbt {
    return new Psbt({ network })
  }
}
