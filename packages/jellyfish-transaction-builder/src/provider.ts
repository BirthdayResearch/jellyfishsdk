import BigNumber from 'bignumber.js'
import { EllipticPair } from '@defichain/jellyfish-crypto'
import { Vout } from '@defichain/jellyfish-transaction'

export interface FeeRateProvider {
  /**
   * @return {BigNumber} fee rate estimate in DFI/KB
   */
  estimate: () => Promise<BigNumber>
}

export interface ListUnspentQueryOptions {
  minimumAmount?: number
  maximumAmount?: number
  maximumCount?: number
  minimumSumAmount?: number
  tokenId?: string
}

export interface PrevoutProvider {
  /**
   * @return {Prevout[]} all outputs to create transaction, aka to send all.
   */
  all: () => Promise<Prevout[]>

  /**
   * Collect minimum number of Prevout required to create a transaction.
   * As PrevoutProvider allows an agnostic implementation, it is free to use
   * any UTXO selector patterns.
   *
   * @param {BigNumber} minBalance of balance combined in a Prevout required for a single transaction.
   * required to create transaction.
   * @return {Prevout[]} selected all required for creating the transaction
   */
  collect: (minBalance: BigNumber) => Promise<Prevout[]>
}

/**
 * Prevout required to construct transaction.
 */
export interface Prevout extends Vout {
  txid: string
  vout: number
}

export interface EllipticPairProvider {
  /**
   * @param {Prevout} prevout for the EllipticPair
   * @return {EllipticPair}
   */
  get: (prevout: Prevout) => EllipticPair
}
