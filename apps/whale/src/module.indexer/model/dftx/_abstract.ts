import { RawBlock } from '@src/module.indexer/model/_abstract'
import { blockchain } from '@defichain/jellyfish-api-core'
import { DfTx } from '@defichain/jellyfish-transaction'

export abstract class DfTxIndexer<T> {
  abstract OP_CODE: number

  abstract index (block: RawBlock, txns: Array<DfTxTransaction<T>>): Promise<void>

  abstract invalidate (block: RawBlock, txns: Array<DfTxTransaction<T>>): Promise<void>
}

export interface DfTxTransaction<T> {
  txn: blockchain.Transaction
  dftx: DfTx<T>
}
