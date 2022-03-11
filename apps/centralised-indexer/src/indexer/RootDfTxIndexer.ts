import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { Injectable, Logger } from '@nestjs/common'
import { DexSwapIndexer } from './dex-swap/DexSwapIndexer'
import { DfTx, OP_DEFI_TX, OPCode, toOPCodes } from '@defichain/jellyfish-transaction'
import { Transaction } from '@defichain/jellyfish-api-core/src/category/blockchain'
import { Indexer } from './RootIndexer'
import { SmartBuffer } from 'smart-buffer'
import { TokenIndexer } from './token/TokenIndexer'

export interface DfTxIndexer<T> {
  OP_CODE: number

  index: (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<T>) => Promise<void>
  invalidate: (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<T>) => Promise<void>
}

/**
 * Encapsulates logic for finding dfTx transactions and delegating them
 * to registered dfTx indexers
 */
@Injectable()
export class RootDfTxIndexer implements Indexer {
  private readonly indexers: Array<DfTxIndexer<any>>

  constructor (
    private readonly logger: Logger,
    private readonly dexSwapIndexer: DexSwapIndexer,
    private readonly tokenIndexer: TokenIndexer
  ) {
    this.indexers = [
      dexSwapIndexer,
      tokenIndexer
    ]
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    const dfTxns = this.getDfTxns(block)
    for (const indexer of this.indexers) {
      for (const dfTx of dfTxns) {
        if (indexer.OP_CODE === dfTx.dftx.type) {
          await indexer.index(block, dfTx)
        }
      }
    }
  }

  async invalidate (block: defid.Block<defid.Transaction>): Promise<void> {
    const dfTxns = this.getDfTxns(block)
    for (const indexer of this.indexers) {
      for (const dfTx of dfTxns) {
        await indexer.invalidate(block, dfTx)
      }
    }
  }

  private getDfTxns (block: defid.Block<defid.Transaction>): Array<DfTxTransaction<any>> {
    const transactions: Array<DfTxTransaction<any>> = []

    for (let i = 0; i < block.tx.length; i++) {
      const txn = block.tx[i]
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
          continue
        }

        try {
          const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
          if (stack[1].type !== 'OP_DEFI_TX') {
            continue
          }
          transactions.push({
            txn: txn,
            txnNo: i,
            dftx: (stack[1] as OP_DEFI_TX).tx
          })
        } catch (err) {
          this.logger.error(`Failed to parse a DfTx Transaction with txid: ${txn.txid}`, err)
        }
      }
    }

    return transactions
  }
}

export interface DfTxTransaction<T> {
  txn: Transaction
  /**
   * Index order of where the Transaction appear in the Block
   */
  txnNo: number
  dftx: DfTx<T>
}
