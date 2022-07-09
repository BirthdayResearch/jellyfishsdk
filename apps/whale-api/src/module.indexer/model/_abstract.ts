import { blockchain } from '@defichain/jellyfish-api-core'

export type RawBlock = blockchain.Block<blockchain.Transaction>
export { blockchain as defid }

/**
 * An indexer must index/invalidate all specified model type.
 *
 * @example a block
 * @example all transactions in block
 * @example all transaction.vin in transaction
 * @example all transaction.vout in transaction
 */
export abstract class Indexer {
  /**
   * @param {RawBlock} block from defid to index
   */
  abstract index (block: RawBlock): Promise<void>

  /**
   * @param {RawBlock} block from defid to invalidate (remove from index)
   */
  abstract invalidate (block: RawBlock): Promise<void>
}
