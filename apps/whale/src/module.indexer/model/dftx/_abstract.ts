import { RawBlock } from '../../../module.indexer/model/_abstract'
import { blockchain } from '@defichain/jellyfish-api-core'
import { DfTx } from '@defichain/jellyfish-transaction'

export abstract class DfTxIndexer<T> {
  abstract OP_CODE: number

  async indexBlockStart (_: RawBlock): Promise<void> {
  }

  async indexBlockEnd (_: RawBlock): Promise<void> {
  }

  abstract indexTransaction (block: RawBlock, txns: DfTxTransaction<T>): Promise<void>

  async invalidateBlockStart (_: RawBlock): Promise<void> {
  }

  async invalidateBlockEnd (_: RawBlock): Promise<void> {
  }

  abstract invalidateTransaction (block: RawBlock, txns: DfTxTransaction<T>): Promise<void>
}

export interface DfTxTransaction<T> {
  txn: blockchain.Transaction
  /**
   * Index order of where the Transaction appear in the Block
   */
  txnNo: number
  dftx: DfTx<T>
}
